"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuthed } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthed() ? "/app/cart" : "/login");
  }, [router]);

  return null;
}
