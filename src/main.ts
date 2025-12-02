import * as BunnySDK from "https://esm.sh/@bunny.net/edgescript-sdk@0.11.2";





BunnySDK.net.http.serve(async (request: Request): Response | Promise<Response> => {

    const data= {
        "weather":"sunny",
        "temperature" : 2799,
        "windspeed": 0,
        "uvindex": 7
    }

    const json=JSON.stringify(data);

    return new Response(json, {
        headers: {
            "content-type": "application/json"
        }
    });
});
