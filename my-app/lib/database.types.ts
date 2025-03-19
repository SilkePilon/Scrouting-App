export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          name: string | null
          is_admin: boolean
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          name?: string | null
          is_admin?: boolean
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          name?: string | null
          is_admin?: boolean
        }
      }
      events: {
        Row: {
          id: string
          name: string
          description: string | null
          date: string
          created_at: string
          creator_id: string
          access_code: string
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          date: string
          created_at?: string
          creator_id: string
          access_code?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          date?: string
          created_at?: string
          creator_id?: string
          access_code?: string
          is_active?: boolean
        }
      }
      posts: {
        Row: {
          id: string
          event_id: string
          name: string
          description: string | null
          location: string | null
          order_number: number
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          description?: string | null
          location?: string | null
          order_number: number
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          location?: string | null
          order_number?: number
        }
      }
      post_volunteers: {
        Row: {
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
        }
      }
      walking_groups: {
        Row: {
          id: string
          event_id: string
          name: string
          description: string | null
          start_time: string | null
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          description?: string | null
          start_time?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          start_time?: string | null
        }
      }
      checkpoints: {
        Row: {
          id: string
          walking_group_id: string
          post_id: string
          checked_at: string
          checked_by: string
          notes: string | null
        }
        Insert: {
          id?: string
          walking_group_id: string
          post_id: string
          checked_at?: string
          checked_by: string
          notes?: string | null
        }
        Update: {
          id?: string
          walking_group_id?: string
          post_id?: string
          checked_at?: string
          checked_by?: string
          notes?: string | null
        }
      }
      volunteers: {
        Row: {
          id: string
          name: string
          event_id: string
          login_timestamp: string
          last_activity: string | null
        }
        Insert: {
          id?: string
          name: string
          event_id: string
          login_timestamp?: string
          last_activity?: string | null
        }
        Update: {
          id?: string
          name?: string
          event_id?: string
          login_timestamp?: string
          last_activity?: string | null
        }
      }
      volunteer_codes: {
        Row: {
          id: string
          event_id: string
          volunteer_name: string
          access_code: string
          created_at: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          volunteer_name: string
          access_code: string
          created_at?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          volunteer_name?: string
          access_code?: string
          created_at?: string
          used?: boolean
          used_at?: string | null
        }
      }
    }
  }
}

