import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SpeologieQR = {
  id: string;
  slug: string;
  caves_id: string;
  created_at: string;
  updated_at: string;
};

export type SpeologieQRInsert = Omit<SpeologieQR, "id" | "created_at" | "updated_at">;
export type SpeologieQRUpdate = Partial<Pick<SpeologieQR, "slug" | "caves_id">>;
