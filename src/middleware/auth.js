let activeSessions = new Map();

const auth = (roles = []) => (req, res, next) => {
  const sessionId = req.header('Authorization')?.replace('Bearer ', '');
  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Access denied' });
  }

  const session = activeSessions.get(sessionId);
  if (roles.length && !roles.includes(session.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  req.user = session;
  next();
};

module.exports = { auth, activeSessions };
