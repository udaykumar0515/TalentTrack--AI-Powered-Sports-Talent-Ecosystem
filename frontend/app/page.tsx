'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, Activity, TrendingUp, Target, BarChart3, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-lg text-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">TalentTrack</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance">
              Train Smarter with{' '}
              <span className="text-primary">AI-Powered</span> Performance Analysis
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
              Record your workouts, get instant AI form analysis, and track your progress.
              Built for athletes who demand excellence.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8">
                  Start Training Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional-grade tools for serious athletes and dedicated coaches
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Activity,
              title: 'AI Form Analysis',
              description: 'Get instant feedback on your technique with computer vision AI',
              color: 'text-primary',
            },
            {
              icon: TrendingUp,
              title: 'Performance Tracking',
              description: 'Monitor your progress with detailed analytics and insights',
              color: 'text-success',
            },
            {
              icon: Target,
              title: 'Smart Goals',
              description: 'Set and achieve your targets with AI-powered recommendations',
              color: 'text-warning',
            },
            {
              icon: BarChart3,
              title: 'Advanced Analytics',
              description: 'Dive deep into your performance metrics and trends',
              color: 'text-primary',
            },
            {
              icon: Users,
              title: 'Coach Connection',
              description: 'Connect with coaches for personalized guidance and support',
              color: 'text-success',
            },

          ].map((feature, i) => (
            <div
              key={i}
              className="group relative p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 backdrop-blur p-12 md:p-20 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Ready to Transform Your Training?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of athletes already using TalentTrack to reach their peak performance
            </p>
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">TalentTrack</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 TalentTrack. Built with AI SDK and Next.js.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
