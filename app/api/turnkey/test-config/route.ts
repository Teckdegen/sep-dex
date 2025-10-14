import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Check if required environment variables are set
  const requiredEnvVars = [
    'TURNKEY_BASE_URL',
    'TURNKEY_API_PRIVATE_KEY',
    'TURNKEY_API_PUBLIC_KEY',
    'TURNKEY_ORGANIZATION_ID',
    'NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  return NextResponse.json({
    environment: {
      TURNKEY_BASE_URL: process.env.TURNKEY_BASE_URL ? 'SET' : 'MISSING',
      TURNKEY_API_PRIVATE_KEY: process.env.TURNKEY_API_PRIVATE_KEY ? 'SET' : 'MISSING',
      TURNKEY_API_PUBLIC_KEY: process.env.TURNKEY_API_PUBLIC_KEY ? 'SET' : 'MISSING',
      TURNKEY_ORGANIZATION_ID: process.env.TURNKEY_ORGANIZATION_ID ? 'SET' : 'MISSING',
      NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID ? 'SET' : 'MISSING',
    },
    missing: missingEnvVars,
    allRequiredSet: missingEnvVars.length === 0
  });
}