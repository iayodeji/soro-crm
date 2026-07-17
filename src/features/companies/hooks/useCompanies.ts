"use client";

import { useCallback, useEffect, useState } from "react";
import type { Company, CreateCompanyInput, Phase } from "@/types";

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/companies")
      .then((response) => (response.ok ? response.json() : { companies: [] }))
      .then((data) => {
        if (!cancelled) {
          setCompanies(data.companies ?? []);
          setCompaniesLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanies([]);
          setCompaniesLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateCompany = useCallback(async (company: Company) => {
    const existingCompany = companies.find((item) => item.id === company.id);
    setCompanies((current) => existingCompany
      ? current.map((item) => item.id === company.id ? company : item)
      : [...current, company]);

    try {
      const response = await fetch("/api/companies", {
        method: existingCompany ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });
      if (!response.ok) throw new Error("Company save failed");
    } catch (error) {
      setCompanies((current) => existingCompany
        ? current.map((item) => item.id === existingCompany.id ? existingCompany : item)
        : current.filter((item) => item.id !== company.id));
      throw error;
    }
  }, [companies]);

  const addNewCompany = useCallback(async (phase: Phase = "lead_found") => {
    const now = new Date().toISOString();
    const company: CreateCompanyInput = {
      id: `company-${Date.now()}`,
      name: "New Company",
      website: null,
      industry: null,
      notes: "Add the company context, buying signals, or relationship notes.",
      phase,
      createdAt: now,
      updatedAt: now,
    };
    await updateCompany(company as Company);
    return company as Company;
  }, [updateCompany]);

  const deleteCompany = useCallback(async (companyId: string) => {
    const previous = companies;
    setCompanies((current) => current.filter((company) => company.id !== companyId));
    try {
      const response = await fetch(`/api/companies?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Company delete failed");
    } catch (error) {
      setCompanies(previous);
      throw error;
    }
  }, [companies]);

  const importCompanies = useCallback(async (rows: Record<string, string>[]) => {
    const response = await fetch("/api/crm/import", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "companies", rows }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Company import failed.");
    const imported = (payload.imported ?? []) as Company[];
    setCompanies((current) => [...imported, ...current]);
    return imported;
  }, []);

  return { companies, companiesLoaded, updateCompany, addNewCompany, deleteCompany, importCompanies };
}
