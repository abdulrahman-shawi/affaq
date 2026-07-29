import Link from "next/link";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  ChartBar,
  MessagesSquare,
  CreditCard,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "إدارة الطلاب والمعلمين",
    description: "سجلات شاملة للطلاب والمعلمين وأولياء الأمور في مكان واحد.",
  },
  {
    icon: CalendarCheck,
    title: "متابعة الحضور",
    description: "تسجيل الحضور والغياب لكل حصة مع تقارير دورية دقيقة.",
  },
  {
    icon: ChartBar,
    title: "الدرجات والتقارير",
    description: "رصد الدرجات وإحصائيات الأداء بمخططات واضحة وسهلة القراءة.",
  },
  {
    icon: CreditCard,
    title: "إدارة المدفوعات",
    description: "متابعة الاشتراكات والمدفوعات وتنبيهات انتهاء الاشتراك.",
  },
  {
    icon: MessagesSquare,
    title: "تواصل فعّال",
    description: "رسائل مباشرة بين المعلمين والطلاب وأولياء الأمور.",
  },
  {
    icon: GraduationCap,
    title: "واجبات وتسليمات",
    description: "إنشاء الواجبات واستلام التسليمات وتقييمها إلكترونيًا.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            آفاق أكاديمي
          </h1>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
          منصة تعليمية متكاملة تجمع الطالب والمعلم وولي الأمر في مكان واحد —
          حضور، درجات، واجبات، مدفوعات، وتواصل مستمر.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            تسجيل الدخول
          </Link>
          <a
            href="#features"
            className="rounded-md border border-input bg-background px-8 py-3 text-lg font-medium transition-colors hover:bg-accent"
          >
            اكتشف المزيد
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/40 py-16">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">
            مميزات المنصة
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
              >
                <feature.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="container flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">جاهز للبدء؟</h2>
          <p className="text-muted-foreground">
            سجّل الدخول للوصول إلى لوحة التحكم الخاصة بك.
          </p>
          <Link
            href="/login"
            className="rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            الدخول إلى المنصة
          </Link>
        </div>
      </section>
    </main>
  );
}
