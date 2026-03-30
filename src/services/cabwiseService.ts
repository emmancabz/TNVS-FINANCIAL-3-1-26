import { supabase } from '../../database/supabase'

export const askCabwise = async (messages: any[]) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    const { data, error } = await supabase.functions.invoke('cabwise-chat', {
      body: { messages },
      headers: {
        'x-client-info': 'supabase-js-web',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      }
    })

    if (error) throw error
    if (!data?.reply) throw new Error('No reply received')

    return data.reply

  } catch (error: any) {
    console.error('Cabwise Error:', error)

    let message = ''

    // 🔌 No internet
    if (!navigator.onLine) {
      message = "No internet connection. Please check your network and try again."

    // 🚦 Rate limit / too many requests
    } else if (error?.message?.includes('429') || error?.message?.includes('rate')) {
      message = "Cabwise is currently busy. Please try again in a few seconds."

    // ⏳ Timeout
    } else if (error?.message?.toLowerCase().includes('timeout')) {
      message = "The request took too long to process. Please try again."

    // 🔐 Auth error
    } else if (error?.message?.includes('401')) {
      message = "Your session has expired. Please log in again."

    // 🧠 No response from AI
    } else if (error?.message?.includes('No reply')) {
      message = "I couldn’t generate a response. Please try again."

    // 🌐 Network/server issue
    } else if (error?.message?.toLowerCase().includes('fetch')) {
      message = "Unable to connect to the server. Please try again later."

    // 💥 Server error
    } else if (error?.message?.includes('500')) {
      message = "Internal server error. Please try again later."

    } else {
      // 🎲 fallback (AI-style, randomized)
      const fallback = [
        "Something went wrong. Please try again.",
        "I couldn’t process your request. Try again.",
        "An unexpected error occurred. Please retry.",
        "Is there anything else you want to know?"
      ]

      message = fallback[Math.floor(Math.random() * fallback.length)]
    }

    return message
  }
}