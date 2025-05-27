import axios from 'axios';

const verifyRecaptcha = async (req, res, next) => {
  const token = req.body.recaptchaToken;
  if (!token) {
    return res.status(400).json({ message: "reCAPTCHA token is required" });
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        }
      }
    );

    if (!response.data.success) {
      return res.status(403).json({ message: "reCAPTCHA verification failed" });
    }

    next();
  } catch (error) {
    console.error("reCAPTCHA error:", error);
    return res.status(500).json({ message: "reCAPTCHA verification error" });
  }
};

export default verifyRecaptcha;
