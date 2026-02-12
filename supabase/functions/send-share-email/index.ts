// Edge Function: send-share-email
// Triggered by database webhook when a new share is inserted in shared_libraries
// Sends an email via Resend API and updates the share status to "sent"

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()

    console.log("Received share:", record)

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    // Generate share acceptance link
    const shareLink = `https://tab-organizer.netlify.app/?share=${record.id}`

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
    .icon { font-size: 48px; margin-bottom: 10px; display: block; }
    .header h1 { margin: 0; font-size: 22px; color: #1a1a1a; }
    .content { padding: 30px 0; }
    .content p { margin: 0 0 16px 0; }
    .message-box { background: #f8f9fa; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-style: italic; }
    .button-wrapper { text-align: center; margin: 24px 0; }
    .button { display: inline-block; padding: 14px 32px; background: #3b82f6; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .link-fallback { text-align: center; font-size: 13px; color: #888; word-break: break-all; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #f0f0f0; color: #999; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="icon">${record.library_icon || "📚"}</span>
      <h1>Nueva Libreria Compartida</h1>
    </div>
    <div class="content">
      <p><strong>${record.sender_email}</strong> ha compartido contigo la libreria <strong>"${record.library_name}"</strong> en Tab Organizer.</p>
      ${record.library_data?.message ? `<div class="message-box">"${record.library_data.message}"</div>` : ""}
      <p>Haz clic en el boton para ver y aceptar esta libreria:</p>
      <div class="button-wrapper">
        <a href="${shareLink}" class="button">Ver Libreria Compartida</a>
      </div>
      <p class="link-fallback">O copia este enlace: ${shareLink}</p>
    </div>
    <div class="footer">
      <p>Este correo fue enviado por Tab Organizer</p>
      <p>Si no esperabas este mensaje, puedes ignorarlo.</p>
    </div>
  </div>
</body>
</html>`

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Tab Organizer <onboarding@resend.dev>",
        to: [record.recipient_email],
        subject: `${record.sender_email} te ha compartido "${record.library_name}"`,
        html: emailHtml,
      }),
    })

    const resendResult = await resendResponse.json()
    console.log("Resend response:", resendResult)

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendResult)}`)
    }

    // Update status to 'sent' in Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { error: updateError } = await supabase
      .from("shared_libraries")
      .update({ status: "sent" })
      .eq("id", record.id)

    if (updateError) {
      console.error("Error updating status:", updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, email_id: resendResult.id }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    console.error("Error in send-share-email function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
