import type { User, Tenant } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      tenant: Tenant | null;
    }
  }
}

export {};
