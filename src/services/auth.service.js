const { supabase } = require('../config/supabase');
const userRepo = require('../repositories/user.repository');
const { AuthError, ValidationError, ConflictError } = require('../utils/errors');
const { isAdminEmail } = require('../utils/env');
const { logError } = require('../utils/logger');

function resolveRole(email) {
  return isAdminEmail(email) ? 'admin' : 'customer';
}

async function register(email, password, name) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (authError) {
    throw new AuthError(authError.message || 'Registration failed');
  }

  if (!authData.user) {
    throw new AuthError('Registration failed: no user returned');
  }

  if (!authData.user.id) {
    throw new AuthError('Registration failed: no user ID returned from auth provider');
  }

  let user;
    try {
      user = await userRepo.create(authData.user.id, {
        name: name || null,
        email,
        role: resolveRole(email),
      });
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('Email already registered');
    }
    throw err;
  }

  const { events } = require('../events');
  events.emit(events.USER_REGISTERED, { user });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

async function login(email, password) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const existingUser = await userRepo.findByEmail(email);
  if (!existingUser) {
    throw new AuthError('Incorrect email/username');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logError(error, { statusCode: 401, context: { email } });

    if (error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('credentials')) {
      throw new AuthError('Incorrect password');
    }
    if (error.message?.toLowerCase().includes('confirm') || error.message?.toLowerCase().includes('not confirmed')) {
      throw new AuthError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
    }
    if (error.message?.toLowerCase().includes('disabled') || error.message?.toLowerCase().includes('not allowed')) {
      throw new AuthError('Authentication is disabled for this user. Contact support if you believe this is an error.');
    }
    throw new AuthError(`Authentication failed: ${error.message || 'Unknown error'}`);
  }

  if (!data?.session) {
    logError(
      new Error('Supabase returned no error but also no session — possible email confirmation required or auth misconfiguration'),
      { statusCode: 401, context: { email, dataKeys: data ? Object.keys(data) : 'null', hasUser: !!data?.user } }
    );
    throw new AuthError('Incorrect password');
  }

  if (!data.session.access_token) {
    throw new AuthError('Missing access token');
  }

  if (!data.session.refresh_token) {
    throw new AuthError('Missing refresh token');
  }

  const authUser = data.user ?? data.session?.user;
  if (!authUser?.id) {
    throw new AuthError('Authentication returned no user ID');
  }

  let user = await userRepo.findById(authUser.id);
  if (!user) {
    user = await userRepo.findByEmail(authUser.email);
    if (!user) {
      user = await userRepo.create(authUser.id, {
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
        role: resolveRole(authUser.email),
      });
    }
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

async function googleOAuth(idToken) {
  if (!idToken) {
    throw new ValidationError('ID token is required');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error || !data?.session || !data?.user) {
    throw new AuthError('Google authentication failed');
  }

  if (!data.session.access_token) {
    throw new AuthError('Missing access token from Google authentication');
  }

  const authUser = data.user;
  const googleId = authUser.id;
  const email = authUser.email;
  const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;

  let existingUser = await userRepo.findByEmail(email);

  if (!existingUser) {
    existingUser = await userRepo.create(authUser.id, {
      name,
      email,
      role: resolveRole(email),
      googleId,
    });
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
    },
  };
}

async function getProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AuthError('User not found');
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

module.exports = {
  register,
  login,
  googleOAuth,
  getProfile,
};
