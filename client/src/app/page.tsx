import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { JobCategories } from "@/components/home/JobCategories";
import { LatestJobs } from "@/components/home/LatestJobs";
import { WhyNubJobs } from "@/components/home/WhyNubJobs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { CompaniesStrip } from "@/components/home/CompaniesStrip";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsBar />
        <JobCategories />
        <LatestJobs />
        <WhyNubJobs />
        <HowItWorks />
        <Testimonials />
        <CompaniesStrip />
      </main>
      <Footer />
    </>
  );
}
