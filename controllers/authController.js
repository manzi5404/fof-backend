const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/user');
const resetModel = require('../models/passwordReset');

const emailUtils = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const timestamp = () => new Date().toISOString();
const authLog = (...args) => console.log(`[${timestamp()}]`, ...args);
const authError = (...args) => console.error(`[${timestamp()}]`, ...args);

const signup = async (req, res) => {
    authLog('⚙️ authController.signup start', { email: req.body.email });
    try {
        const { email, password, name } = req.body;
        const existingUser = await userModel.getUserByEmail(email);
        if (existingUser) {
            authLog('⚠️ authController.signup user exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }

        const password_hash = await bcrypt.hash(password, 12);
        const userId = await userModel.createUser({ email, password_hash, name });

        // For signup, we don't necessarily log them in as admin immediately in this flow,
        // but we'll follow the same JWT pattern if we did.
        const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'fof_secret', { expiresIn: '2h' });

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        res.status(201).json({ success: true, token, userId, name, email });
    } catch (error) {
        authError('❌ authController.signup error:', error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

const login = async (req, res) => {
    authLog('⚙️ authController.login start', { email: req.body.email });
    try {
        const { email, password } = req.body;
        const user = await userModel.getUserByEmail(email);
        if (!user) {
            authLog('⚠️ authController.login user not found', { email });
            return res.status(404).json({ message: 'User not found' });
        }


        if (!user.password_hash) {
            return res.status(400).json({ message: 'Account registered with Google. Please use Google Login.' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) {
            authLog('⚠️ authController.login invalid credentials', { email });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fof_secret', { expiresIn: '2h' });

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        res.status(200).json({ success: true, token, userId: user.id, name: user.name, email: user.email });
    } catch (error) {
        authError('❌ authController.login error:', error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await userModel.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await resetModel.createResetToken(user.id, resetToken, expiresAt);

        const frontendUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;

        await emailUtils.sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message: `You requested a password reset for your Faith Over Fear account.\n\nPlease click on the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, please ignore this email.`
        });

        res.status(200).json({ message: 'Reset link sent to email' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Something went wrong while processing reset request', error: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        const tokenInfo = await resetModel.getTokenInfo(token);
        if (!tokenInfo) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const password_hash = await bcrypt.hash(newPassword, 12);
        await userModel.updatePassword(tokenInfo.user_id, password_hash);

        await resetModel.deleteTokensByUserId(tokenInfo.user_id);

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Something went wrong during password reset', error: error.message });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
        } catch (authError) {
            console.error('Google Auth Verification Error:', authError);
            if (authError.code === 'ETIMEDOUT' || authError.message.includes('timeout')) {
                return res.status(503).json({
                    success: false,
                    message: 'Authentication service timeout. Please check your internet connection or try again later.'
                });
            }
            throw authError; // Re-throw to be caught by the outer catch block
        }

        const { name, email, sub: google_id } = ticket.getPayload();


        let user = await userModel.getUserByGoogleId(google_id);

        if (!user) {
            user = await userModel.getUserByEmail(email);
            if (user) {
                await userModel.linkGoogleAccount(user.id, google_id);
                user = await userModel.getUserById(user.id);
            } else {
                const userId = await userModel.createUser({
                    email,
                    name,
                    google_id,
                    password_hash: null
                });
                user = await userModel.getUserById(userId);
            }
        }

        const jwtToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'fof_secret',
            { expiresIn: '2h' }
        );

        res.cookie('auth_token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        res.status(200).json({ success: true, token: jwtToken, userId: user.id, name: user.name, email: user.email });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ message: 'Google authentication failed', error: error.message });
    }
};

const logout = async (req, res) => {
    res.clearCookie('auth_token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

const verify = async (req, res) => {
    // If the middleware verifyAdmin passes, we reach here
    res.status(200).json({ success: true, user: req.user });
};

module.exports = {
    signup,
    login,
    forgotPassword,
    resetPassword,
    googleLogin,
    logout,
    verify
};

