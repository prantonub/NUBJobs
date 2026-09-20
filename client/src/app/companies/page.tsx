"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  MapPinIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/axios";

interface Company {
  id: string;
  name: string;
  logo: string | null;
  location: string | null;
  industry: string | null;
  jobsCount: number;
  isVerified: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const PAGE_SIZE = 12;

/**
 * Company directory. The navbar and footer both link here, and the API exposes
 * `GET /api/companies` (verified employers only), so this page lists what that
 * endpoint returns. Each card links into the job search filtered by company
 * name — there is no per-company page to link to, and a filtered job search is
 * the more useful destination for a student anyway.
 */
export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "mostJobs">("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setFailed(false);

      try {
        const { data } = await api.get("/companies", {
          params: { search: search || undefined, sort, page, limit: PAGE_SIZE },
        });

        if (!active) return;
        setCompanies(Array.isArray(data?.data) ? data.data : []);
        setPagination(data?.pagination ?? null);
      } catch {
        if (!active) return;
        setCompanies([]);
        setPagination(null);
        setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [search, sort, page]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeSort = (next: "newest" | "mostJobs") => {
    setSort(next);
    setPage(1);
  };

  const total = pagination?.total ?? 0;
  const pages = pagination?.pages ?? 1;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Companies hiring NUB students
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse verified employers on NUBJobs and jump straight to their open positions.
          </p>
        </div>

        {/* Search + sort */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={submitSearch} className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search companies by name"
              aria-label="Search companies"
              className="pl-9"
            />
          </form>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={sort === "newest" ? "default" : "outline"}
              onClick={() => changeSort("newest")}
            >
              Newest
            </Button>
            <Button
              type="button"
              variant={sort === "mostJobs" ? "default" : "outline"}
              onClick={() => changeSort("mostJobs")}
            >
              Most jobs
            </Button>
          </div>
        </div>

        {!loading && total > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Showing {first}-{last} of {total} {total === 1 ? "company" : "companies"}
          </p>
        ) : null}

        {/* Results */}
        {failed ? (
          <Card className="mt-6 p-10 text-center">
            <p className="text-red-600">Could not load companies. Please try again.</p>
          </Card>
        ) : loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : companies.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="flex flex-col p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <CompanyLogo name={company.name} logoUrl={company.logo} size="lg" />

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-foreground">{company.name}</h2>

                    {company.isVerified ? (
                      <Badge className="mt-1 gap-1 bg-emerald-100 text-emerald-700">
                        <ShieldCheckIcon className="size-3" />
                        Verified
                      </Badge>
                    ) : null}

                    <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {company.industry ? (
                        <div className="flex items-center gap-1.5">
                          <Building2Icon className="size-3.5 shrink-0" />
                          <dd className="truncate">{company.industry}</dd>
                        </div>
                      ) : null}
                      {company.location ? (
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="size-3.5 shrink-0" />
                          <dd className="truncate">{company.location}</dd>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <BriefcaseBusinessIcon className="size-3.5 shrink-0" />
                        <dd>
                          {company.jobsCount} open{" "}
                          {company.jobsCount === 1 ? "position" : "positions"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <Button asChild variant="outline" className="mt-4 w-full sm:w-auto">
                  <Link href={`/jobs?q=${encodeURIComponent(company.name)}`}>
                    View open jobs
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-6 p-10 text-center">
            <p className="text-muted-foreground">
              {search
                ? `No companies match "${search}".`
                : "No verified companies yet. Approved employers will appear here."}
            </p>
            {search ? (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear search
              </Button>
            ) : null}
          </Card>
        )}


        {/* Pagination */}
        {!loading && pages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: pages }).map((_, index) => {
              const target = index + 1;
              return (
                <Button
                  key={target}
                  variant={target === page ? "default" : "outline"}
                  onClick={() => setPage(target)}
                >
                  {target}
                </Button>
              );
            })}
            <Button
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

