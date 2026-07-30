import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)

function CardForm({
  clientSecret,
  customerId,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  customerId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!stripe || !elements) return
    setSaving(true)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Card element not found')

      const { error, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        { payment_method: { card: cardElement } }
      )

      if (error) {
        toast({
          title: 'Card error',
          description: error.message || 'Failed to save card.',
          variant: 'destructive',
        })
        return
      }

      if (setupIntent?.status === 'succeeded') {
        await supabase.functions.invoke('confirm-payment-method', {
          body: {
            payment_method_id: setupIntent.payment_method,
            customer_id: customerId,
          },
        })
        // Non-fatal if this fails — card is saved in Stripe
        // f_check_org_limit checks stripe_customer_id which
        // was already saved by create-setup-intent

        toast({
          title: 'Payment method saved',
          description: 'Your card has been saved. You can now make calls at $1.00/min.',
        })
        onSuccess()
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 bg-muted/20">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '14px',
                color: 'hsl(var(--foreground))',
                '::placeholder': {
                  color: 'hsl(var(--muted-foreground))',
                },
              },
            },
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Your card will not be charged now. You will only be billed for call
        minutes used at $1.00/min, invoiced monthly.
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !stripe}>
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
            : <><CreditCard className="h-4 w-4 mr-1.5" />Save Card</>
          }
        </Button>
      </DialogFooter>
    </div>
  )
}

export function AddPaymentMethodDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      return
    }

    const fetchSetupIntent = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('create-setup-intent')
        if (error) throw error
        setClientSecret(data.client_secret)
        setCustomerId(data.customer_id)
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Could not initialize payment setup.',
          variant: 'destructive',
        })
        onOpenChange(false)
      } finally {
        setLoading(false)
      }
    }

    fetchSetupIntent()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Free plan charges $1.00/min for calls, billed monthly. Add a card
            to start making calls.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardForm
              clientSecret={clientSecret}
              customerId={customerId || ''}
              onSuccess={() => {
                onOpenChange(false)
                onSuccess()
              }}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}
