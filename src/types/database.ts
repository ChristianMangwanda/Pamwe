export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ask_pamwe_usage: {
        Row: {
          count: number
          day: string
          last_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          last_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          last_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bible_books: {
        Row: {
          book: string
          chapters: number
          code: string
          ord: number
        }
        Insert: {
          book: string
          chapters: number
          code: string
          ord: number
        }
        Update: {
          book?: string
          chapters?: number
          code?: string
          ord?: number
        }
        Relationships: []
      }
      bible_chapters: {
        Row: {
          book: string
          catalogue_version: string
          chapter: number
          genre: string
          n_verses: number
          summary: string
          themes: string[]
          tone: string
        }
        Insert: {
          book: string
          catalogue_version: string
          chapter: number
          genre: string
          n_verses: number
          summary: string
          themes: string[]
          tone: string
        }
        Update: {
          book?: string
          catalogue_version?: string
          chapter?: number
          genre?: string
          n_verses?: number
          summary?: string
          themes?: string[]
          tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_chapters_book_fkey"
            columns: ["book"]
            isOneToOne: false
            referencedRelation: "bible_books"
            referencedColumns: ["book"]
          },
        ]
      }
      bible_passages: {
        Row: {
          book: string
          caution: string[]
          chapter: number
          summary: string
          themes: string[]
          tone: string
          verse_end: number
          verse_start: number
        }
        Insert: {
          book: string
          caution?: string[]
          chapter: number
          summary: string
          themes?: string[]
          tone: string
          verse_end: number
          verse_start: number
        }
        Update: {
          book?: string
          caution?: string[]
          chapter?: number
          summary?: string
          themes?: string[]
          tone?: string
          verse_end?: number
          verse_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_passages_book_chapter_fkey"
            columns: ["book", "chapter"]
            isOneToOne: false
            referencedRelation: "bible_chapters"
            referencedColumns: ["book", "chapter"]
          },
        ]
      }
      bible_verses: {
        Row: {
          book: string
          caution: string[]
          chapter: number
          search: unknown
          text: string
          themes: string[]
          tone: string
          verse: number
        }
        Insert: {
          book: string
          caution?: string[]
          chapter: number
          search?: unknown
          text: string
          themes?: string[]
          tone: string
          verse: number
        }
        Update: {
          book?: string
          caution?: string[]
          chapter?: number
          search?: unknown
          text?: string
          themes?: string[]
          tone?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_verses_book_chapter_fkey"
            columns: ["book", "chapter"]
            isOneToOne: false
            referencedRelation: "bible_chapters"
            referencedColumns: ["book", "chapter"]
          },
        ]
      }
      bible_vocabulary: {
        Row: {
          gloss: string
          kind: string
          term: string
        }
        Insert: {
          gloss?: string
          kind: string
          term: string
        }
        Update: {
          gloss?: string
          kind?: string
          term?: string
        }
        Relationships: []
      }
      couple_plans: {
        Row: {
          cadence_days: number
          couple_id: string
          created_at: string | null
          current_day: number | null
          id: string
          plan_id: string
          start_date: string
          status: string | null
        }
        Insert: {
          cadence_days?: number
          couple_id: string
          created_at?: string | null
          current_day?: number | null
          id?: string
          plan_id: string
          start_date: string
          status?: string | null
        }
        Update: {
          cadence_days?: number
          couple_id?: string
          created_at?: string | null
          current_day?: number | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couple_plans_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          anniversary: string | null
          created_at: string | null
          freeze_days_used: number | null
          freeze_period_start: string | null
          id: string
          invite_code: string
          invite_expires_at: string
          paired_at: string | null
          partner_a_id: string
          partner_b_id: string | null
          streak_count: number | null
          streak_last_date: string | null
          timezone: string
        }
        Insert: {
          anniversary?: string | null
          created_at?: string | null
          freeze_days_used?: number | null
          freeze_period_start?: string | null
          id?: string
          invite_code: string
          invite_expires_at: string
          paired_at?: string | null
          partner_a_id: string
          partner_b_id?: string | null
          streak_count?: number | null
          streak_last_date?: string | null
          timezone?: string
        }
        Update: {
          anniversary?: string | null
          created_at?: string | null
          freeze_days_used?: number | null
          freeze_period_start?: string | null
          id?: string
          invite_code?: string
          invite_expires_at?: string
          paired_at?: string | null
          partner_a_id?: string
          partner_b_id?: string | null
          streak_count?: number | null
          streak_last_date?: string | null
          timezone?: string
        }
        Relationships: []
      }
      dreams: {
        Row: {
          author_id: string
          couple_id: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          author_id: string
          couple_id: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          author_id?: string
          couple_id?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "dreams_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          audio_duration_seconds: number | null
          audio_url: string | null
          couple_plan_id: string
          created_at: string | null
          day_number: number
          entry_type: string
          id: string
          reveal_seen_at: string | null
          submitted_at: string | null
          text_content: string | null
          transcript: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_url?: string | null
          couple_plan_id: string
          created_at?: string | null
          day_number: number
          entry_type: string
          id?: string
          reveal_seen_at?: string | null
          submitted_at?: string | null
          text_content?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_url?: string | null
          couple_plan_id?: string
          created_at?: string | null
          day_number?: number
          entry_type?: string
          id?: string
          reveal_seen_at?: string | null
          submitted_at?: string | null
          text_content?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_couple_plan_id_fkey"
            columns: ["couple_plan_id"]
            isOneToOne: false
            referencedRelation: "couple_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_responses: {
        Row: {
          author_id: string
          body: string | null
          couple_plan_id: string
          created_at: string
          day_number: number
          entry_id: string
          id: string
          kind: string
          parent_id: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          couple_plan_id: string
          created_at?: string
          day_number: number
          entry_id: string
          id?: string
          kind: string
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          couple_plan_id?: string
          created_at?: string
          day_number?: number
          entry_id?: string
          id?: string
          kind?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_responses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_responses_couple_plan_id_fkey"
            columns: ["couple_plan_id"]
            isOneToOne: false
            referencedRelation: "couple_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_responses_entry_fkey"
            columns: ["entry_id", "couple_plan_id", "day_number"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id", "couple_plan_id", "day_number"]
          },
          {
            foreignKeyName: "entry_responses_parent_fkey"
            columns: ["parent_id", "couple_plan_id", "day_number"]
            isOneToOne: false
            referencedRelation: "entry_responses"
            referencedColumns: ["id", "couple_plan_id", "day_number"]
          },
        ]
      }
      partner_nudges: {
        Row: {
          couple_id: string
          created_at: string
          from_user: string
          id: string
          kind: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          from_user: string
          id?: string
          kind?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_nudges_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_nudges_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      passage_prompts: {
        Row: {
          book: string
          chapter: number
          created_at: string
          id: string
          prompt: string
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          id?: string
          prompt: string
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          prompt?: string
        }
        Relationships: []
      }
      plan_days: {
        Row: {
          day_number: number
          id: string
          passage_reference: string
          passage_text: string | null
          passage_title: string | null
          plan_id: string
          pull_quote: string | null
          pull_quote_ref: string | null
          reflection_prompt: string
        }
        Insert: {
          day_number: number
          id?: string
          passage_reference: string
          passage_text?: string | null
          passage_title?: string | null
          plan_id: string
          pull_quote?: string | null
          pull_quote_ref?: string | null
          reflection_prompt: string
        }
        Update: {
          day_number?: number
          id?: string
          passage_reference?: string
          passage_text?: string | null
          passage_title?: string | null
          plan_id?: string
          pull_quote?: string | null
          pull_quote_ref?: string | null
          reflection_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          about: string | null
          book_label: string | null
          couple_id: string | null
          created_at: string | null
          created_by: string | null
          duration_days: number
          explore: string[] | null
          gain: string[] | null
          id: string
          is_curated: boolean | null
          is_public: boolean
          minutes_label: string | null
          rhythm_label: string | null
          share_token: string | null
          subtitle: string | null
          tagline: string | null
          title: string
          topics: string[]
        }
        Insert: {
          about?: string | null
          book_label?: string | null
          couple_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_days: number
          explore?: string[] | null
          gain?: string[] | null
          id?: string
          is_curated?: boolean | null
          is_public?: boolean
          minutes_label?: string | null
          rhythm_label?: string | null
          share_token?: string | null
          subtitle?: string | null
          tagline?: string | null
          title: string
          topics?: string[]
        }
        Update: {
          about?: string | null
          book_label?: string | null
          couple_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_days?: number
          explore?: string[] | null
          gain?: string[] | null
          id?: string
          is_curated?: boolean | null
          is_public?: boolean
          minutes_label?: string | null
          rhythm_label?: string | null
          share_token?: string | null
          subtitle?: string | null
          tagline?: string | null
          title?: string
          topics?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "plans_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_marks: {
        Row: {
          created_at: string | null
          id: string
          marked_date: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          marked_date?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          marked_date?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_marks_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
        ]
      }
      prayers: {
        Row: {
          answer_note: string | null
          answered_at: string | null
          author_id: string
          category: string
          couple_id: string
          created_at: string | null
          id: string
          notify_partner: boolean
          status: string | null
          text: string
        }
        Insert: {
          answer_note?: string | null
          answered_at?: string | null
          author_id: string
          category?: string
          couple_id: string
          created_at?: string | null
          id?: string
          notify_partner?: boolean
          status?: string | null
          text: string
        }
        Update: {
          answer_note?: string | null
          answered_at?: string | null
          author_id?: string
          category?: string
          couple_id?: string
          created_at?: string | null
          id?: string
          notify_partner?: boolean
          status?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayers_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          accepted_terms_at: string | null
          avatar_initial: string
          couple_id: string | null
          created_at: string | null
          display_name: string
          email: string
          expo_push_token: string | null
          id: string
          last_seen_activity_at: string | null
          notification_dream: boolean
          notification_morning_time: string | null
          notification_note: boolean
          notification_partner: boolean | null
          notification_prayer: boolean | null
          notification_recap: boolean
        }
        Insert: {
          accepted_terms_at?: string | null
          avatar_initial?: string
          couple_id?: string | null
          created_at?: string | null
          display_name: string
          email: string
          expo_push_token?: string | null
          id: string
          last_seen_activity_at?: string | null
          notification_dream?: boolean
          notification_morning_time?: string | null
          notification_note?: boolean
          notification_partner?: boolean | null
          notification_prayer?: boolean | null
          notification_recap?: boolean
        }
        Update: {
          accepted_terms_at?: string | null
          avatar_initial?: string
          couple_id?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          expo_push_token?: string | null
          id?: string
          last_seen_activity_at?: string | null
          notification_dream?: boolean
          notification_morning_time?: string | null
          notification_note?: boolean
          notification_partner?: boolean | null
          notification_prayer?: boolean | null
          notification_recap?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "users_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_highlights: {
        Row: {
          book: string
          chapter: number
          color: string
          couple_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          color: string
          couple_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          color?: string
          couple_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_highlights_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_note_responses: {
        Row: {
          body: string | null
          couple_id: string
          created_at: string
          id: string
          kind: string
          note_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          couple_id: string
          created_at?: string
          id?: string
          kind: string
          note_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          kind?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verse_note_responses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_note_responses_note_fkey"
            columns: ["note_id", "couple_id"]
            isOneToOne: false
            referencedRelation: "verse_notes"
            referencedColumns: ["id", "couple_id"]
          },
          {
            foreignKeyName: "verse_note_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_notes: {
        Row: {
          book: string
          chapter: number
          couple_id: string
          created_at: string | null
          id: string
          text: string
          updated_at: string | null
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          couple_id: string
          created_at?: string | null
          id?: string
          text: string
          updated_at?: string | null
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          couple_id?: string
          created_at?: string | null
          id?: string
          text?: string
          updated_at?: string | null
          user_id?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_notes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activity_feed: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          actor_id: string
          happened_at: string
          id: string
          kind: string
          preview: string
          target: Json
        }[]
      }
      bump_ask_pamwe_usage: {
        Args: { p_user: string }
        Returns: {
          new_count: number
          prev_last_at: string
        }[]
      }
      can_reply_to_response: {
        Args: { p_entry_id: string; p_parent_id: string }
        Returns: boolean
      }
      can_respond_to_entry: { Args: { p_entry_id: string }; Returns: boolean }
      can_view_partner_audio: {
        Args: {
          p_couple_plan_id: string
          p_day_number: number
          p_owner: string
        }
        Returns: boolean
      }
      clear_push_token: { Args: { p_token?: string }; Returns: undefined }
      compute_streak: {
        Args: { p_couple: string }
        Returns: {
          last_date: string
          streak: number
        }[]
      }
      create_couple: {
        Args: { p_timezone?: string }
        Returns: {
          anniversary: string | null
          created_at: string | null
          freeze_days_used: number | null
          freeze_period_start: string | null
          id: string
          invite_code: string
          invite_expires_at: string
          paired_at: string | null
          partner_a_id: string
          partner_b_id: string | null
          streak_count: number | null
          streak_last_date: string | null
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "couples"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_couple_id: { Args: never; Returns: string }
      delete_account: { Args: { p_user: string }; Returns: Json }
      generate_invite_code: { Args: never; Returns: string }
      get_shared_plan: {
        Args: { p_token: string }
        Returns: {
          couples: number
          duration_days: number
          id: string
          subtitle: string
          tagline: string
          title: string
          topics: string[]
        }[]
      }
      has_user_submitted_entry: {
        Args: {
          p_couple_plan_id: string
          p_day_number: number
          p_user_id: string
        }
        Returns: boolean
      }
      join_couple: {
        Args: { p_code: string }
        Returns: {
          anniversary: string | null
          created_at: string | null
          freeze_days_used: number | null
          freeze_period_start: string | null
          id: string
          invite_code: string
          invite_expires_at: string
          paired_at: string | null
          partner_a_id: string
          partner_b_id: string | null
          streak_count: number | null
          streak_last_date: string | null
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "couples"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_reveal_seen: {
        Args: { p_couple_plan: string; p_day: number }
        Returns: undefined
      }
      notify_config: { Args: never; Returns: Record<string, unknown> }
      plan_reader_counts: {
        Args: { p_plan_ids: string[] }
        Returns: {
          couples: number
          plan_id: string
        }[]
      }
      regenerate_invite_code: {
        Args: never
        Returns: {
          anniversary: string | null
          created_at: string | null
          freeze_days_used: number | null
          freeze_period_start: string | null
          id: string
          invite_code: string
          invite_expires_at: string
          paired_at: string | null
          partner_a_id: string
          partner_b_id: string | null
          streak_count: number | null
          streak_last_date: string | null
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "couples"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retrieve_passages: {
        Args: {
          allow_cautions?: string[]
          max_rows?: number
          want_themes: string[]
        }
        Returns: {
          book: string
          caution: string[]
          chapter: number
          chapter_verses: number
          genre: string
          score: number
          summary: string
          themes: string[]
          tone: string
          verse_end: number
          verse_start: number
        }[]
      }
      save_push_token: {
        Args: { p_platform?: string; p_token: string }
        Returns: undefined
      }
      search_verses: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          book: string
          chapter: number
          rank: number
          text: string
          verse: number
        }[]
      }
      set_couple_anniversary: {
        Args: { p_anniversary: string }
        Returns: string
      }
      set_entry_transcript: {
        Args: { p_entry_id: string; p_transcript: string }
        Returns: undefined
      }
      share_plan: { Args: { p_plan_id: string }; Returns: string }
      switch_plan: {
        Args: { p_cadence?: number; p_couple: string; p_plan: string }
        Returns: {
          cadence_days: number
          couple_id: string
          created_at: string | null
          current_day: number | null
          id: string
          plan_id: string
          start_date: string
          status: string | null
        }
        SetofOptions: {
          from: "*"
          to: "couple_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_legacy_push_token: { Args: { p_user: string }; Returns: undefined }
      unread_activity_count: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

