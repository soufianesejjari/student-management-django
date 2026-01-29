'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, LineChart, PieChart, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"

export default function ReportsPage() {
  const t = useTranslations()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          {t('reports.exportReports')}
        </Button>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
          <TabsTrigger value="students">{t('reports.students')}</TabsTrigger>
          <TabsTrigger value="finances">{t('reports.finances')}</TabsTrigger>
          <TabsTrigger value="courses">{t('reports.courses')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.enrollmentEvolution')}</CardTitle>
                <CardDescription>{t('reports.enrollmentEvolutionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="flex items-center gap-2 mb-4">
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('reports.trend')}: </span>
                  <span className="text-sm text-green-500 font-medium">{t('reports.increasing')}</span>
                </div>
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.enrollmentChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.revenueDistribution')}</CardTitle>
                <CardDescription>{t('reports.revenueDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('reports.topCategory')}: </span>
                  <span className="text-sm font-medium">Piano (32%)</span>
                </div>
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.revenueChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.globalPerformance')}</CardTitle>
              <CardDescription>{t('reports.globalPerformanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('reports.annualGrowth')}: </span>
                <span className="text-sm text-green-500 font-medium">+15%</span>
              </div>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                {t('reports.performanceChartPlaceholder')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="students" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.ageDistribution')}</CardTitle>
                <CardDescription>{t('reports.ageDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.ageChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.instrumentDistribution')}</CardTitle>
                <CardDescription>{t('reports.instrumentDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.instrumentChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.retentionRate')}</CardTitle>
              <CardDescription>{t('reports.retentionRateDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                {t('reports.retentionChartPlaceholder')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finances" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.revenueVsExpenses')}</CardTitle>
                <CardDescription>{t('reports.revenueVsExpensesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.revenueExpensesChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.expenseDistribution')}</CardTitle>
                <CardDescription>{t('reports.expenseDistributionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.expenseChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.financialForecasts')}</CardTitle>
              <CardDescription>{t('reports.financialForecastsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                {t('reports.forecastsChartPlaceholder')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="courses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.coursePopularity')}</CardTitle>
                <CardDescription>{t('reports.coursePopularityDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.popularityChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.occupancyRate')}</CardTitle>
                <CardDescription>{t('reports.occupancyRateDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                  {t('reports.occupancyChartPlaceholder')}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.courseEvolution')}</CardTitle>
              <CardDescription>{t('reports.courseEvolutionDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground">
                {t('reports.courseEvolutionChartPlaceholder')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
