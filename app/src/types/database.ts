// Database types for Velorum Invitation Service
// Auto-generate these with: npx supabase gen types typescript --local > src/types/database.ts

export type EntityType = 'individual' | 'organization'
export type ApprovalMode = 'manual' | 'auto' | 'sales'
export type InvitationCodeType = 'standard' | 'referral' | 'sales'
export type InvitationCodeStatus = 'active' | 'redeemed' | 'revoked'
export type InvitationRequestStatus = 'pending' | 'approved' | 'rejected'
export type MemberStatus = 'trial' | 'active' | 'churned' | 'suspended'
export type QualificationStatus = 'pending' | 'qualified' | 'failed'
export type RewardStatus = 'pending' | 'credited' | 'forfeited' | 'capped'
export type AuditAction =
  | 'request_approved'
  | 'request_rejected'
  | 'code_generated'
  | 'code_revoked'
  | 'member_suspended'
  | 'member_reactivated'
  | 'product_updated'
  | 'settings_changed'

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          slug: string
          name: string
          entity_type: EntityType
          approval_mode: ApprovalMode
          trial_days: number
          referral_reward_months: number
          referral_cap_per_year: number
          referral_qualification_days: number
          referral_chargeback_buffer_days: number
          config: ProductConfig
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          entity_type: EntityType
          approval_mode?: ApprovalMode
          trial_days?: number
          referral_reward_months?: number
          referral_cap_per_year?: number
          referral_qualification_days?: number
          referral_chargeback_buffer_days?: number
          config?: ProductConfig
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          entity_type?: EntityType
          approval_mode?: ApprovalMode
          trial_days?: number
          referral_reward_months?: number
          referral_cap_per_year?: number
          referral_qualification_days?: number
          referral_chargeback_buffer_days?: number
          config?: ProductConfig
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invitation_requests: {
        Row: {
          id: string
          product_id: string
          email: string
          name: string | null
          form_data: Record<string, unknown>
          referred_by_code: string | null
          status: InvitationRequestStatus
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          email: string
          name?: string | null
          form_data?: Record<string, unknown>
          referred_by_code?: string | null
          status?: InvitationRequestStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          email?: string
          name?: string | null
          form_data?: Record<string, unknown>
          referred_by_code?: string | null
          status?: InvitationRequestStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invitation_codes: {
        Row: {
          id: string
          product_id: string
          code: string
          code_type: InvitationCodeType
          status: InvitationCodeStatus
          request_id: string | null
          issued_to_email: string | null
          created_by: string | null
          redeemed_by_member_id: string | null
          redeemed_at: string | null
          generated_by_member_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          code: string
          code_type?: InvitationCodeType
          status?: InvitationCodeStatus
          request_id?: string | null
          issued_to_email?: string | null
          created_by?: string | null
          redeemed_by_member_id?: string | null
          redeemed_at?: string | null
          generated_by_member_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          code?: string
          code_type?: InvitationCodeType
          status?: InvitationCodeStatus
          request_id?: string | null
          issued_to_email?: string | null
          created_by?: string | null
          redeemed_by_member_id?: string | null
          redeemed_at?: string | null
          generated_by_member_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          product_id: string
          email: string
          name: string | null
          invitation_code_id: string | null
          referred_by_member_id: string | null
          referral_code: string | null
          stripe_customer_id: string | null
          trial_ends_at: string | null
          first_paid_at: string | null
          status: MemberStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          email: string
          name?: string | null
          invitation_code_id?: string | null
          referred_by_member_id?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
          first_paid_at?: string | null
          status?: MemberStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          email?: string
          name?: string | null
          invitation_code_id?: string | null
          referred_by_member_id?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
          first_paid_at?: string | null
          status?: MemberStatus
          created_at?: string
          updated_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          product_id: string
          referrer_member_id: string
          referred_member_id: string
          referral_code_used: string
          qualification_status: QualificationStatus
          qualified_at: string | null
          reward_status: RewardStatus
          reward_credited_at: string | null
          reward_year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          referrer_member_id: string
          referred_member_id: string
          referral_code_used: string
          qualification_status?: QualificationStatus
          qualified_at?: string | null
          reward_status?: RewardStatus
          reward_credited_at?: string | null
          reward_year: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          referrer_member_id?: string
          referred_member_id?: string
          referral_code_used?: string
          qualification_status?: QualificationStatus
          qualified_at?: string | null
          reward_status?: RewardStatus
          reward_credited_at?: string | null
          reward_year?: number
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          admin_user_id: string
          action_type: AuditAction
          target_table: string
          target_id: string | null
          details: Record<string, unknown>
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          action_type: AuditAction
          target_table: string
          target_id?: string | null
          details?: Record<string, unknown>
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          action_type?: AuditAction
          target_table?: string
          target_id?: string | null
          details?: Record<string, unknown>
          ip_address?: string | null
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          product_id: string
          key_hash: string
          name: string
          is_active: boolean
          last_used_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          key_hash: string
          name: string
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          key_hash?: string
          name?: string
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
    }
    Functions: {
      generate_invitation_code: {
        Args: { product_slug: string }
        Returns: string
      }
      generate_referral_code: {
        Args: { member_name: string; product_slug: string }
        Returns: string
      }
      count_member_referrals_for_year: {
        Args: { p_member_id: string; p_year: number }
        Returns: number
      }
    }
    Enums: {
      entity_type: EntityType
      approval_mode: ApprovalMode
      invitation_code_type: InvitationCodeType
      invitation_code_status: InvitationCodeStatus
      invitation_request_status: InvitationRequestStatus
      member_status: MemberStatus
      qualification_status: QualificationStatus
      reward_status: RewardStatus
      audit_action: AuditAction
    }
  }
}

// Helper types for easier usage
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type InvitationRequest = Database['public']['Tables']['invitation_requests']['Row']
export type InvitationRequestInsert = Database['public']['Tables']['invitation_requests']['Insert']
export type InvitationRequestUpdate = Database['public']['Tables']['invitation_requests']['Update']

export type InvitationCode = Database['public']['Tables']['invitation_codes']['Row']
export type InvitationCodeInsert = Database['public']['Tables']['invitation_codes']['Insert']
export type InvitationCodeUpdate = Database['public']['Tables']['invitation_codes']['Update']

export type Member = Database['public']['Tables']['members']['Row']
export type MemberInsert = Database['public']['Tables']['members']['Insert']
export type MemberUpdate = Database['public']['Tables']['members']['Update']

export type Referral = Database['public']['Tables']['referrals']['Row']
export type ReferralInsert = Database['public']['Tables']['referrals']['Insert']
export type ReferralUpdate = Database['public']['Tables']['referrals']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']

// Product config type
export interface ProductConfig {
  monthly_price?: number
  [key: string]: unknown
}

// Extended types with relations
export interface InvitationRequestWithProduct extends InvitationRequest {
  product: Product
}

export interface InvitationCodeWithProduct extends InvitationCode {
  product: Product
}

export interface MemberWithProduct extends Member {
  product: Product
}

export interface MemberWithReferrals extends Member {
  product: Product
  referrals_made: Referral[]
  referred_by: Member | null
}

export interface ReferralWithMembers extends Referral {
  referrer: Member
  referred: Member
  product: Product
}
