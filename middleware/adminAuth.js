import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-in-production';

export const signAdminToken = (adminId) => {
  return jwt.sign({ adminId }, ADMIN_JWT_SECRET, { expiresIn: '7d' });
};

export const verifyAdmin = (req, res, next) => {
  try {
    const header = req.header('Authorization');
    const token = header?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No admin token provided',
      });
    }

    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token',
    });
  }
};

