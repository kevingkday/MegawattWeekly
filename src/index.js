export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Intercept API subscription requests
        if (url.pathname === "/api/subscribe" && request.method === "POST") {
            return await handleSubscribe(request, env);
        }

        // Fallback to serving static assets (HTML, CSS, JS, etc.)
        return env.ASSETS.fetch(request);
    }
};

async function handleSubscribe(request, env) {
    try {
        const { email } = await request.json();

        if (!email) {
            return new Response(JSON.stringify({ error: "Email is required" }), {
                status: 400,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        const API_KEY = env.BUTTONDOWN_API_KEY;

        if (!API_KEY) {
            return new Response(JSON.stringify({ 
                error: "Server configuration missing: Please set BUTTONDOWN_API_KEY in your Cloudflare dashboard." 
            }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        // Call the Buttondown API
        const buttondownResponse = await fetch(`https://api.buttondown.email/v1/subscribers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${API_KEY}`
            },
            body: JSON.stringify({
                email_address: email,
                metadata: {
                    source: "megawattweekly_website"
                }
            })
        });

        const data = await buttondownResponse.json();

        if (buttondownResponse.ok) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } else {
            const errorMsg = formatError(data);
            return new Response(JSON.stringify({ error: errorMsg }), {
                status: buttondownResponse.status,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error: " + err.message }), {
            status: 500,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
}

function formatError(data) {
    if (!data) {
        return "Buttondown subscription failed";
    }
    if (typeof data === 'string') {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(item => formatError(item)).join(', ');
    }
    if (typeof data === 'object') {
        if (data.detail) return formatError(data.detail);
        if (data.message) return formatError(data.message);
        return Object.entries(data).map(([key, val]) => {
            return `${key}: ${formatError(val)}`;
        }).join('; ');
    }
    return String(data);
}
