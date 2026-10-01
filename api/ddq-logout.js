const COOKIE_NAME = 'aetherum_ddq_session';

module.exports = async (req, res) => {
  res.statusCode = 303;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', COOKIE_NAME + '=; Max-Age=0; Path=/ddq; HttpOnly; Secure; SameSite=Lax');
  res.setHeader('Location', '/ddq');
  return res.end();
};
