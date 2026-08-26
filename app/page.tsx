import Link from "next/link";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  ChartBar,
  MessagesSquare,
  CreditCard,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "إدارة الطلاب والمعلمين",
    description: "سجلات شاملة للطلاب والمعلمين وأولياء الأمور في مكان واحد.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: CalendarCheck,
    title: "متابعة الحضور",
    description: "تسجيل الحضور والغياب لكل حصة مع تقارير دورية دقيقة.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: ChartBar,
    title: "الدرجات والتقارير",
    description: "رصد الدرجات وإحصائيات الأداء بمخططات واضحة وسهلة القراءة.",
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    icon: CreditCard,
    title: "إدارة المدفوعات",
    description: "متابعة الاشتراكات والمدفوعات وتنبيهات انتهاء الاشتراك.",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: MessagesSquare,
    title: "تواصل فعّال",
    description: "رسائل مباشرة بين المعلمين والطلاب وأولياء الأمور.",
    color: "bg-rose-500/10 text-rose-600",
  },
  {
    icon: GraduationCap,
    title: "واجبات وتسليمات",
    description: "إنشاء الواجبات واستلام التسليمات وتقييمها إلكترونيًا.",
    color: "bg-sky-500/10 text-sky-600",
  },
];

const highlights = [
  { value: "4", label: "لوحات تحكم مخصصة", note: "طالب، معلم، ولي أمر، إدارة" },
  { value: "100%", label: "متابعة شاملة", note: "حضور ودرجات وواجبات ومدفوعات" },
  { value: "24/7", label: "وصول مستمر", note: "من أي جهاز وفي أي وقت" },
  { value: "1", label: "مكان واحد", note: "لكل ما يخص العملية التعليمية" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="text-lg font-bold">آفاق أكاديمي</span>
          </div>
          <Button asChild>
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]"
        />
        <div className="container relative flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            منصة تعليمية متكاملة
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            تعليم منظم، متابعة دقيقة،
            <span className="text-primary"> وتواصل بلا حدود</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            آفاق أكاديمي تجمع الطالب والمعلم وولي الأمر في مكان واحد — حضور،
            درجات، واجبات، مدفوعات، وتواصل مستمر.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="px-8 text-base">
              <Link href="/login">
                تسجيل الدخول
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 text-base">
              <a href="#features">اكتشف المزيد</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-y bg-muted/40 py-12">
        <div className="container grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <Card
              key={item.label}
              className="text-center transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <p className="text-3xl font-bold text-primary" dir="ltr">
                  {item.value}
                </p>
                <p className="mt-1 font-semibold">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">مميزات المنصة</h2>
            <p className="mt-3 text-muted-foreground">
              كل ما تحتاجه الأكاديمية لإدارة العملية التعليمية بكفاءة
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div
                    className={`mb-4 inline-flex rounded-xl p-3 ${feature.color}`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container">
          <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">جاهز للبدء؟</h2>
              <p className="max-w-xl text-primary-foreground/80">
                سجّل الدخول للوصول إلى لوحة التحكم الخاصة بك وابدأ بمتابعة كل
                ما يخصك.
              </p>
              <Button asChild size="lg" variant="secondary" className="px-8">
                <Link href="/login">
                  الدخول إلى المنصة
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">آفاق أكاديمي</span>
          </div>
          <p>منصة تعليمية متكاملة لإدارة الأكاديميات</p>
        </div>
      </footer>
    </main>
  );
}
