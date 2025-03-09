'use client';

import Link from 'next/link';
import { Metadata } from "next";
import { CreditsDashboard } from "@/components/insight-core/CreditsDashboard";
import { SolutionGenerator } from "@/components/insight-core/SolutionGenerator";
import { ApiStatusIndicator } from "@/components/insight-core/ApiStatusIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRightIcon, SparklesIcon, BrainIcon, LightBulbIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard | Insight Synergy",
  description: "Dein persönliches Dashboard für den Zugriff auf Insight Synergy",
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen bei Insight Synergy, deinem intelligenten Problemlösungs-Assistenten
        </p>
        <ApiStatusIndicator className="mt-2" />
      </div>

      <Tabs defaultValue="insight-core" className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="insight-core" className="flex items-center">
            <SparklesIcon className="mr-2 h-4 w-4" />
            <span>Insight Core</span>
          </TabsTrigger>
          <TabsTrigger value="nexus">
            <BrainIcon className="mr-2 h-4 w-4" />
            <span>The Nexus</span>
          </TabsTrigger>
          <TabsTrigger value="cognitive-loop">
            <LightBulbIcon className="mr-2 h-4 w-4" />
            <span>Cognitive Loop</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insight-core" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Insight Core</CardTitle>
                <CardDescription>
                  Generiere fundierte Lösungen mit KI-gestützter Faktenrecherche
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SolutionGenerator />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Insight Core Features</CardTitle>
                <CardDescription>
                  Entdecke die Funktionen von Insight Core
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <FeatureCard 
                    title="Faktenbasierte Lösungen" 
                    description="Alle Antworten werden automatisch auf Faktentreue geprüft"
                    icon={<CheckIcon className="h-8 w-8 text-green-500" />}
                  />
                  <FeatureCard 
                    title="Quellenangaben" 
                    description="Transparente Darstellung aller Informationsquellen"
                    icon={<LinkIcon className="h-8 w-8 text-blue-500" />}
                  />
                  <FeatureCard 
                    title="Vielseitige Anwendung" 
                    description="Von einfachen Fragen bis zu komplexen Problemen"
                    icon={<LayersIcon className="h-8 w-8 text-purple-500" />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <CreditsDashboard />
        </TabsContent>

        <TabsContent value="nexus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>The Nexus - Expertendebatten (Coming Soon)</CardTitle>
              <CardDescription>
                Erlebe mehrperspektivische Problemlösung durch verschiedene Expertenrollen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-8 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <BrainIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium">The Nexus wird bald verfügbar sein</h3>
                <p className="text-sm text-muted-foreground">
                  Wir arbeiten daran, dir bald Zugang zu unserem fortschrittlichen Expertendebatten-System zu geben.
                </p>
                <div className="mt-6">
                  <ComingSoonButton />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FeatureCard 
                  title="Experten-Debatte" 
                  description="Verschiedene Fachexperten diskutieren dein Problem"
                  icon={<UsersIcon className="h-8 w-8 text-amber-500" />}
                />
                <FeatureCard 
                  title="Echtzeit-Dialog" 
                  description="Verfolge, wie Experten in Echtzeit interagieren"
                  icon={<ClockIcon className="h-8 w-8 text-cyan-500" />}
                />
                <FeatureCard 
                  title="Tiefer Einblick" 
                  description="Entdecke Aspekte, die du nicht bedacht hättest"
                  icon={<EyeIcon className="h-8 w-8 text-indigo-500" />}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cognitive-loop" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cognitive Loop AI (Coming Soon)</CardTitle>
              <CardDescription>
                Persönliche adaptive KI, die deine Denkweise und Präferenzen lernt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-8 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <LightBulbIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium">Cognitive Loop wird bald verfügbar sein</h3>
                <p className="text-sm text-muted-foreground">
                  Unser adaptives Lernsystem, das sich an deine Denkweise anpasst, befindet sich in der Entwicklung.
                </p>
                <div className="mt-6">
                  <ComingSoonButton />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FeatureCard 
                  title="Personalisierung" 
                  description="Lernt deine Denkweise und Präferenzen"
                  icon={<UserIcon className="h-8 w-8 text-red-500" />}
                />
                <FeatureCard 
                  title="Langzeitlernen" 
                  description="Verbessert sich mit jeder Interaktion"
                  icon={<TrendingUpIcon className="h-8 w-8 text-emerald-500" />}
                />
                <FeatureCard 
                  title="Denkmuster" 
                  description="Speichert und visualisiert Gedankenprozesse"
                  icon={<NetworkIcon className="h-8 w-8 text-orange-500" />}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border p-4 text-center">
      <div className="mb-3">{icon}</div>
      <h3 className="mb-1 text-base font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ComingSoonButton() {
  return (
    <button
      className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      disabled
    >
      Benachrichtige mich
      <ArrowRightIcon className="ml-2 h-4 w-4" />
    </button>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function NetworkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="5" r="3" />
      <line x1="12" x2="12" y1="8" y2="10" />
      <circle cx="5" cy="19" r="3" />
      <line x1="5" x2="5" y1="16" y2="14" />
      <circle cx="19" cy="19" r="3" />
      <line x1="19" x2="19" y1="16" y2="14" />
      <path d="M12 10a5 5 0 0 1 5 5" />
      <path d="M7 15a5 5 0 0 1 5-5" />
    </svg>
  );
} 