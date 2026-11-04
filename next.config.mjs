import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // تقليص حجم الحزمة عند أول تحميل — تجميع الواردات المستخدمة فقط
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default withPWA(nextConfig);
