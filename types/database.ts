/**
 * Supabase types.
 *
 * Regenerate with `npm run db:types` — which needs a LINKED project and network access
 * to Maor's Supabase, and therefore cannot be run from the build container that writes
 * these deltas. That is why this file is hand-written today and says so instead of
 * carrying the usual "never hand-edit" banner over something that has been hand-edited.
 *
 * **What is here.** Exactly what `supabase/migrations/20260922090000_worker_shared_project.sql`
 * creates: seven `worker_*` tables and the functions a client calls. The Supabase project is
 * SHARED with DUBID, so a generator run against it will also emit DUBID's `public` tables
 * (arenas, bets, profiles, questions, system_configs). Those belong to the other app — THE
 * WORKER never reads them, and a regenerated file should be trimmed back to `worker_*`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      worker_profile: {
        /** Created by `worker_profile_ensure()` the first time a person opens THE WORKER. */
        Row: {
          id: string
          display_name: string | null
          member_no: string | null
          since: string
          card: Json | null
          card_edited_at: string | null
          shirt_number: number | null
          supporter: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          member_no?: string | null
          since?: string
          card?: Json | null
          card_edited_at?: string | null
          shirt_number?: number | null
          supporter?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          member_no?: string | null
          since?: string
          card?: Json | null
          card_edited_at?: string | null
          shirt_number?: number | null
          supporter?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /**
       * Grow-only: RLS lets the owner READ their rows and nobody write them directly —
       * every write goes through `worker_collect`, which never deletes.
       */
      worker_profile_item: {
        Row: {
          user_id: string
          set_id: string
          item_id: string
          added_on: string
        }
        Insert: {
          user_id: string
          set_id: string
          item_id: string
          added_on?: string
        }
        Update: {
          user_id?: string
          set_id?: string
          item_id?: string
          added_on?: string
        }
        Relationships: []
      }
      worker_gate_run: {
        Row: {
          id: string
          user_id: string
          gate: string
          seed: number | null
          score: number
          asked: number
          correct: number
          played_on: string
          played_at: string
          idempotency_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gate: string
          seed?: number | null
          score?: number
          asked?: number
          correct?: number
          played_on?: string
          played_at?: string
          idempotency_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gate?: string
          seed?: number | null
          score?: number
          asked?: number
          correct?: number
          played_on?: string
          played_at?: string
          idempotency_key?: string
          created_at?: string
        }
        Relationships: []
      }
      /**
       * Typed for completeness and unreachable from any client: the table has RLS on
       * and no policy at all, so `from('worker_poll_vote')` answers nothing whoever asks. The
       * ballot goes through `worker_poll_cast` and comes back only as `worker_poll_tally`.
       */
      worker_poll_vote: {
        Row: {
          id: string
          device_id: string
          question_id: string
          pick: string
          voted_at: string
        }
        Insert: {
          id?: string
          device_id: string
          question_id: string
          pick: string
          voted_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          question_id?: string
          pick?: string
          voted_at?: string
        }
        Relationships: []
      }
      /** Owner-only read. Every write goes through `worker_mark_questions`. */
      worker_question_mark: {
        Row: {
          user_id: string
          question_id: string
          topic: string | null
          wrong: number
          right: number
          last_outcome: 'w' | 'r'
          last_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      /** Royal Rumble live (gate 9). Read by the two players; written only by `worker_rr_*`. */
      worker_rr_room: {
        Row: {
          id: string
          code: string
          host_user_id: string
          guest_user_id: string | null
          match_seed: number
          status: 'waiting' | 'drafting' | 'countdown' | 'playing' | 'finished' | 'expired'
          host_ready: boolean
          guest_ready: boolean
          starts_at: string | null
          created_at: string
          updated_at: string
          expires_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      worker_rr_entry: {
        Row: {
          room_id: string
          user_id: string
          offer_seed: number
          picks: Json | null
          ready: boolean
          locked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      worker_record_run: {
        Args: {
          p_key: string
          p_gate: string
          p_score?: number
          p_asked?: number
          p_correct?: number
          p_seed?: number | null
          p_played_on?: string | null
        }
        Returns: { run_id: string; first_time: boolean }[]
      }
      worker_collect: {
        Args: { p_set: string; p_ids: string[] }
        Returns: number
      }
      worker_poll_cast: {
        Args: { p_device_id: string; p_question_id: string; p_pick: string }
        Returns: undefined
      }
      worker_poll_tally: {
        Args: { p_question_id: string }
        Returns: { pick: string; votes: number }[]
      }
      worker_profile_ensure: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['worker_profile']['Row'][]
      }
      worker_mark_questions: {
        Args: { p_marks: Json }
        Returns: number
      }
      worker_rr_create_room: {
        Args: { p_match_seed: number; p_offer_seed: number }
        Returns: { room_id: string; code: string; match_seed: number }[]
      }
      worker_rr_join_room: {
        Args: { p_code: string; p_match_seed: number; p_offer_seed: number }
        Returns: { room_id: string; code: string; match_seed: number }[]
      }
      worker_rr_lock: {
        Args: { p_room_id: string; p_offer_seed: number; p_picks: Json }
        Returns: { status: string; host_ready: boolean; guest_ready: boolean; starts_at: string | null }[]
      }
      worker_rr_state: {
        Args: { p_room_id: string }
        Returns: {
          room_id: string
          code: string
          match_seed: number
          status: string
          is_host: boolean
          opponent_joined: boolean
          you_ready: boolean
          opponent_ready: boolean
          starts_at: string | null
          expires_at: string
        }[]
      }
      worker_rr_claim: {
        Args: { p_room_id: string }
        Returns: {
          match_seed: number
          host_user_id: string
          guest_user_id: string
          host_offer_seed: number
          guest_offer_seed: number
          host_picks: Json
          guest_picks: Json
          starts_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
