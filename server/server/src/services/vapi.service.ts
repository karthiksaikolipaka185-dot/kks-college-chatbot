// ============================================
// PURPOSE: Handle Vapi API calls for outbound calling
// ============================================

interface CallPayload {
  phoneNumber: string;
  userName: string;
  userEmail: string;
  preferredCourse?: string;
  queryTopic?: string;
}

interface VapiCallResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

/**
 * Safely normalizes Indian phone numbers into E.164 format (+91XXXXXXXXXX)
 * Prevents country code duplication (e.g., 919876543210 -> +919876543210, NOT +91919876543210)
 */
export const normalizeIndianPhone = (rawPhone: string): string => {
  let cleaned = rawPhone.replace(/[\s\-\(\)]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  cleaned = cleaned.replace(/^0+/, "");

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  return `+${cleaned}`;
};

export const initiateOutboundCall = async (payload: CallPayload): Promise<VapiCallResponse> => {
  const { phoneNumber, userName, userEmail, preferredCourse, queryTopic } = payload;

  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
  const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !VAPI_ASSISTANT_ID) {
    console.error("[VAPI SERVICE ERROR] Missing required Vapi environment variables (VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, VAPI_ASSISTANT_ID)");
    throw new Error("Vapi configuration missing on server.");
  }

  const formattedPhone = normalizeIndianPhone(phoneNumber);

  console.log(`[VAPI SERVICE] Initiating outbound call to ${formattedPhone} for student: ${userName}`);

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId: VAPI_ASSISTANT_ID,
      assistantOverrides: {
        firstMessage: `Hi ${userName}, this is Ava from KKS College. I'm calling to help you with information about ${preferredCourse || "our programs"}. Do you have a quick moment?`,
        variableValues: {
          studentName: userName,
          studentEmail: userEmail,
          preferredCourse: preferredCourse || "Not specified",
          queryTopic: queryTopic || "General inquiry",
        },
      },
      phoneNumberId: VAPI_PHONE_NUMBER_ID,
      customer: {
        number: formattedPhone,
        name: userName,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[VAPI API ERROR]", {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
    throw new Error(`Vapi API error (${response.status}): ${JSON.stringify(errorData)}`);
  }

  const data = (await response.json()) as VapiCallResponse;
  return data;
};