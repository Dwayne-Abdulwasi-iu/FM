import nodemailer from 'nodemailer';

const user = process.env.GMAIL_USERNAME;
const pass = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass }
});

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  await transporter.sendMail({
    from: user,
    to,
    subject,
    text,
    html
  });
}
