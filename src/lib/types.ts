export type Role = "admin" | "reader";

export type Profile = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: Role;
  created_at: string;
  last_login: string;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover: string | null;
  storage_path: string;
  status: "active" | "disabled";
  amazon_link: string | null;
  created_at: string;
};

export type ReadingProgress = {
  user_id: string;
  book_id: string;
  current_page: number;
  updated_at: string;
};
