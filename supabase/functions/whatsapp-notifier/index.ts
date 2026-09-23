// Deno runtime (Supabase Edge Functions)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID")!
const TOKEN    = Deno.env.get("ID_ACCESO_WHATSAPP")!
const TEMPLATE = Deno.env.get("WHATSAPP_TEMPLATE_NAME")! // "notificacionb2b_new_cup"
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // Webhook payload from Supabase
    const body = await req.json()
    const record = body.record // cupones_reclamados row

    // Extract necessary data from payload
    const cuponId = record["Cupon ID"] || "-"
    const reclamacionId = record["Reclamacion ID"] || "-"
    const nombreUsuario = record["Nombre Usuario"] || "Cliente"
    const celularUsuario = record["Celular Usuario"] || "-"
    const ccNitB2B = record["cc_nit"]

    console.log(`Procesando reclamo ${reclamacionId} para comercio ${ccNitB2B}`)

    if (!ccNitB2B) {
      return new Response(JSON.stringify({ error: "No cc_nit provided in record" }), { status: 400 })
    }

    // Initialize Supabase Admin Client to query the B2B client's phone number
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Query clientes_b2b table to get the phone number
    const { data: b2bClient, error: clientError } = await supabase
      .from('clientes_b2b')
      .select('celular')
      .eq('cc_nit', ccNitB2B)
      .single()

    if (clientError || !b2bClient) {
      console.error('Error fetching B2B client:', clientError)
      return new Response(JSON.stringify({ error: "Cliente B2B no encontrado" }), { status: 404 })
    }

    const celularRaw = String(b2bClient.Celular || "")
    const celular = celularRaw.replace(/\D/g, "")

    if (!celular || celular.length < 10) {
      console.error('Celular de comercio inválido:', celular)
      return new Response(JSON.stringify({ error: "Celular del comercio inválido" }), { status: 400 })
    }

    // Format phone number to international format (Colombia: +57)
    const toNumber = celular.startsWith("57") ? celular : `57${celular}`

    // Payload for Meta Graph API
    // Template parameters:
    // {{1}} Nombre Usuario B2C
    // {{2}} Celular Usuario B2C
    // {{3}} Reclamacion ID (Comprobante)
    const payload = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: "template",
      template: {
        name: TEMPLATE,
        language: { code: "es_CO" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(nombreUsuario) },
              { type: "text", text: String(celularUsuario) },
              { type: "text", text: String(reclamacionId) }
            ]
          }
        ]
      }
    }

    // Call Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    )

    const metaJson = await metaRes.json()
    console.log("Meta API Response:", JSON.stringify(metaJson))

    return new Response(JSON.stringify(metaJson), {
      status: metaRes.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Unhandled error in edge function:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
