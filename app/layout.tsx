import "./globals.css";

export const metadata = {
  title: "SnapCal",
  description: "From screenshot to schedule in seconds. Turn your college timetable into an interactive calendar automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
