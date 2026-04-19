import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslations } from "next-intl"
import { Instagram, Phone, Mail, MapPin, Clock, ArrowRight, Music } from "lucide-react"

export default function Home() {
  const t = useTranslations()

  const programs = [
    {
      title: "MUSIQUE & THÉRAPIE",
      description: "La musicothérapie offre un espace doux, sûr et bienveillant où chaque enfant peut s'exprimer, respirer, progresser et être pleinement accepté.",
      image: "/placeholder.jpg",
      link: "/programmes"
    },
    {
      title: "Chant et Chorale",
      description: "Découvrez l'univers riche et diversifié du chant oriental et andalou à travers nos programmes de chant et chorale.",
      image: "/placeholder.jpg",
      link: "/programmes"
    },
    {
      title: "Cours de Vocalise",
      description: "Une méthode claire et progressive pour développer une voix plus juste, plus forte et plus confiante.",
      image: "/placeholder.jpg",
      link: "/programmes"
    }
  ]

  const discounts = [
    {
      title: "Réduction Famille",
      description: "–5 % pour deux membres ou plus de la même famille."
    },
    {
      title: "Paiement Annuel",
      description: "1 mois offert pour toute inscription réglée en paiement annuel."
    },
    {
      title: "Pack Multi-Cours",
      description: "Une réduction est appliquée pour les élèves inscrits à plus d'un cours."
    }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="The Musical Academy" className="h-12 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#programmes" className="text-sm font-medium hover:text-primary transition-colors">
              Programmes
            </Link>
            <Link href="#qui-sommes-nous" className="text-sm font-medium hover:text-primary transition-colors">
              Qui sommes-nous?
            </Link>
            <Link href="#boutique" className="text-sm font-medium hover:text-primary transition-colors">
              Boutique
            </Link>
            <Link href="#blog" className="text-sm font-medium hover:text-primary transition-colors">
              Blog
            </Link>
            <Link href="#contact" className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button>{t('navigation.login')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 lg:py-40 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                The Musical Academy – Find your rhythm, find your passion.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Découvrez le plaisir d'apprendre la musique dans une école accueillante, créative et ouverte à tous les âges.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="#programmes">
                  <Button size="lg" className="gap-2">
                    Découvrir plus
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    {t('navigation.login')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="qui-sommes-nous" className="py-20 md:py-28 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                À propos de The Musical Academy
              </h2>
            </div>
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <p className="text-muted-foreground md:text-lg leading-relaxed text-center lg:text-left">
                The Musical Academy offre un apprentissage musical innovant et accessible à tous, dès l'âge de 2 ans. Nous proposons des cours d'éveil musical, de solfège, et de pratique instrumentale pour enfants, ainsi que des programmes pour adultes et seniors, incluant des styles traditionnels comme le Tarab, le Melhoun et le Samaa. Notre équipe de professeurs passionnés et qualifiés crée un environnement stimulant, avec des infrastructures modernes et de haute qualité. À The Musical Academy, la musique est une expérience collective où chaque élève, débutant ou confirmé, peut développer ses talents dans un cadre professionnel et chaleureux.
              </p>
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-lg aspect-video overflow-hidden rounded-xl bg-muted">
                  <Image
                    src="/placeholder.jpg"
                    alt="About The Musical Academy"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <Link href="#qui-sommes-nous">
                <Button variant="outline" className="gap-2">
                  En savoir plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section id="programmes" className="py-20 md:py-28 bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Nos programmes musicaux
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {programs.map((program, index) => (
                <Card key={index} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="aspect-video overflow-hidden bg-muted">
                    <Image
                      src={program.image}
                      alt={program.title}
                      width={400}
                      height={225}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <CardContent className="p-6 space-y-3 text-center">
                    <h3 className="text-xl font-bold">{program.title}</h3>
                    <p className="text-muted-foreground">{program.description}</p>
                    <Link href={program.link} className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                      En savoir plus <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Shop Section */}
        <section id="boutique" className="py-20 md:py-28 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Équipez-vous avec les meilleurs instruments
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg max-w-2xl mx-auto">
                Découvrez notre sélection d'instruments et d'accessoires de qualité pour accompagner votre apprentissage musical.
              </p>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="relative w-full max-w-md aspect-square overflow-hidden rounded-xl bg-muted">
                <Image
                  src="/placeholder.jpg"
                  alt="The Musical Bag"
                  fill
                  className="object-contain"
                />
              </div>
              <Link href="#boutique">
                <Button size="lg" className="gap-2">
                  Équipez-vous maintenant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Discounts Section */}
        <section className="py-20 md:py-28 bg-primary/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Des opportunités à ne pas manquer
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {discounts.map((discount, index) => (
                <Card key={index} className="text-center p-8">
                  <CardContent className="space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Music className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{discount.title}</h3>
                    <p className="text-muted-foreground">{discount.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <Link href="#contact">
                <Button size="lg" className="gap-2">
                  Profitez des offres
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Teachers Section */}
        <section className="py-20 md:py-28 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Des professeurs passionnés et expérimentés
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
              Notre équipe réunit des musiciens expérimentés et des pédagogues passionnés, chacun apportant son expertise unique dans le domaine de la musique.
            </p>
            <div className="mt-8">
              <Link href="#qui-sommes-nous">
                <Button variant="outline" size="lg" className="gap-2">
                  Rencontrez nos experts
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 md:py-28 bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Prêt à commencer votre voyage musical?
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg max-w-2xl mx-auto">
                Contactez-nous dès aujourd'hui et faites le premier pas vers la maîtrise de votre passion musicale.
              </p>
            </div>
            <div className="grid gap-12 lg:grid-cols-2 max-w-4xl mx-auto">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <a href="tel:+212695969711" className="font-medium hover:text-primary">
                      +212 695-969711
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <a href="mailto:contact@themusicalacademy.net" className="font-medium hover:text-primary">
                      contact@themusicalacademy.net
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">09 AM - 09 PM</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">
                      à coté du café LE CAVALLI, Av. Taha Houcine, Fès 30050
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">Nom</label>
                  <input
                    id="name"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Votre nom"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="votre@email.com"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <textarea
                    id="message"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Votre message..."
                  />
                </div>
                <Button className="w-full">Envoyer</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <img src="/logo.png" alt="The Musical Academy" className="h-10 w-auto object-contain brightness-0 invert" />
              <div className="flex gap-4">
                <a href="https://www.instagram.com/themusicalacademyfes" className="hover:text-primary-foreground/80">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Menu</h4>
              <nav className="flex flex-col space-y-2">
                <Link href="/" className="text-sm hover:text-primary-foreground/80">Accueil</Link>
                <Link href="#programmes" className="text-sm hover:text-primary-foreground/80">Programmes</Link>
                <Link href="#qui-sommes-nous" className="text-sm hover:text-primary-foreground/80">Qui sommes-nous?</Link>
                <Link href="#boutique" className="text-sm hover:text-primary-foreground/80">Boutique</Link>
                <Link href="#blog" className="text-sm hover:text-primary-foreground/80">Blog</Link>
                <Link href="#contact" className="text-sm hover:text-primary-foreground/80">Contact</Link>
              </nav>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Contact</h4>
              <div className="flex flex-col space-y-2 text-sm">
                <a href="tel:+212695969711" className="hover:text-primary-foreground/80">+212 695-969711</a>
                <a href="mailto:contact@themusicalacademy.net" className="hover:text-primary-foreground/80">contact@themusicalacademy.net</a>
                <span>à coté du café LE CAVALLI, Av. Taha Houcine, Fès 30050</span>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Horaires</h4>
              <div className="text-sm space-y-2">
                <p>Lundi - Vendredi</p>
                <p>09:00 - 21:00</p>
                <p className="text-primary-foreground/80">Weekend sur rendez-vous</p>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/80">
            <p>Tous droits réservés. © The Musical Academy {new Date().getFullYear()}.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}