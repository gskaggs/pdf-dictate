import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { transcript, screenImage, annotationData } = await request.json();

    if (!transcript && !screenImage) {
      return NextResponse.json(
        { error: "Either transcript or screen image is required" },
        { status: 400 }
      );
    }

    const messages: any[] = [
      {
        role: "system",
        content: "You are an AI assistant that helps users edit PDF forms efficiently. Based on the user's voice transcript and/or screen image, provide helpful suggestions for filling out or editing the current form field that has focus. Be concise and actionable."
      }
    ];

    // Add annotation context if provided
    if (annotationData) {
      messages.push({
        role: "user",
        content: `Current form field context: ${JSON.stringify(annotationData, null, 2)}`
      });
    }

    // Add transcript if provided
    if (transcript) {
      messages.push({
        role: "user",
        content: `Here's what the user has been saying: "${transcript}"`
      });
    }

    // Add screen image if provided
    if (screenImage) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Here's a screenshot of the current screen:"
          },
          {
            type: "image_url",
            image_url: {
              url: screenImage
            }
          }
        ]
      });
    }

    messages.push({
      role: "user",
      content: `Based on the context above, what suggestions do you have for editing the current form field? Provide specific, actionable advice.`
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const suggestion = data.choices[0]?.message?.content;

    console.log(suggestion);

    return NextResponse.json({ 
      suggestion,
      success: true 
    });

  } catch (error) {
    console.error("Error in /suggestions:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 