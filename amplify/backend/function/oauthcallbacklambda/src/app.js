const express = require("express");
const bodyParser = require("body-parser");
const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

// initialize for square lib
const dotenv = require("dotenv").config(); // Loads .env file. TODO: need to update env filess
const cookieParser = require("cookie-parser");
const md5 = require("md5");
const { ApiError, Client, Environment } = require("square");
app.use(cookieParser());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

const { PORT, SQ_ENVIRONMENT, SQ_APPLICATION_ID, SQ_APPLICATION_SECRET } =
  process.env;

let basePath;
let environment;
if (SQ_ENVIRONMENT.toLowerCase() === "production") {
  basePath = `https://connect.squareup.com`;
  environment = Environment.Production;
} else if (SQ_ENVIRONMENT.toLowerCase() === "sandbox") {
  basePath = `https://connect.squareupsandbox.com`;
  environment = Environment.Sandbox;
} else {
  console.warn("Unsupported value for SQ_ENVIRONMENT in .env file.");
  process.exit(1);
}

const messages = require("./messages"); //TODO: need to update message file

// Configure Square defcault client
const squareClient = new Client({
  environment: environment,
  userAgentDetail: "sample_app_oauth_node", // Remove or replace this detail when building your own app
});

// Configure Square OAuth API instance
const oauthInstance = squareClient.oAuthApi;

// // Enable CORS for all methods
// // Check this and see if we need to disable this.
// // https://spring.io/guides/gs/rest-service-cors/
// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "*");
//   next();
// });

/**********************
 * get method *
 **********************/

app.get("/callback", async (req, res) => {
  console.log(req.query);
  // // Verify the state to protect against cross-site request forgery.
  // if (req.cookies["Auth_State"] !== req.query["state"]) {
  //   content = messages.displayStateError();
  //   res.render("base", {
  //     content: content,
  //   });
  // } else

  if (req.query["error"]) {
    console.log("=========== in req.query['error'] =========");

    // Check to see if the seller clicked the Deny button and handle it as a special case.
    if (
      "access_denied" === req.query["error"] &&
      "user_denied" === req.query["error_description"]
    ) {
      res.render(
        messages.displayError(
          "Authorization denied",
          "You chose to deny access to the app."
        )
      );
      // res.json("Authorization denied. You chose to deny access to the app.");
    }
    // Display the error and description for all other errors.
    else {
      content = messages.displayError(
        req.query["error"],
        req.query["error_description"]
      );
      res.render("base", {
        content: content,
      });
      // res.json(req.query["error"], req.query["error_description"]);
    }
  }
  // When the response_type is "code", the seller clicked Allow
  // and the authorization page returned the auth tokens.
  else if ("code" === req.query["response_type"]) {
    console.log(
      "=========== in 'code' === req.query['response_type'] ========="
    );
    // Extract the returned authorization code from the URL
    var { code } = req.query;

    try {
      console.log("=========== before call obtainToken =========");
      console.log("==code==", code);
      console.log(
        "==process.env.SQ_APPLICATION_ID==",
        process.env.SQ_APPLICATION_ID
      );
      console.log(
        "==process.env.SQ_APPLICATION_SECRET==",
        process.env.SQ_APPLICATION_SECRET
      );

      let { result } = await oauthInstance.obtainToken({
        // Provide the code in a request to the Obtain Token endpoint
        code,
        clientId: process.env.SQ_APPLICATION_ID,
        clientSecret: process.env.SQ_APPLICATION_SECRET,
        grantType: "authorization_code",
      });

      console.log("=========== before extract value =========");
      let {
        // Extract the returned access token from the ObtainTokenResponse object
        accessToken,
        refreshToken,
        expiresAt,
        merchantId,
      } = result;

      // Because we want to keep things simple and we're using Sandbox,
      // we call a function that writes the tokens to the page so we can easily copy and use them directly.
      // In production, you should never write tokens to the page. You should encrypt the tokens and handle them securely.
      content = messages.writeTokensOnSuccess(
        accessToken,
        refreshToken,
        expiresAt,
        merchantId
      );

      console.log("=========== before render =========");

      res.render("base", {
        content: content,
      });
      // res.json({ accessToken, refreshToken, expiresAt, merchantId });
    } catch (error) {
      // The response from the Obtain Token endpoint did not include an access token. Something went wrong.
      if (error instanceof ApiError) {
        // content = messages.displayError(
        //   "Exception",
        //   JSON.stringify(error.result)
        // );
        // res.render("base", {
        //   content: content,
        // });
        console.log(
          "JSON.stringify(error.result)",
          JSON.stringify(error.result)
        );
        res.json({
          exception: "Exception!",
          messages: JSON.stringify(error.result),
        });
      } else {
        // content = messages.displayError("Exception", JSON.stringify(error));
        // res.render("base", {
        //   content: content,
        // });
        console.log("JSON.stringify(error)", JSON.stringify(error));
        res.json({ exception: "Exception!", messages: JSON.stringify(error) });
      }
    }
  } else {
    // No recognizable parameters were returned.
    content = messages.displayError(
      "Unknown parameters",
      "Expected parameters were not returned"
    );
    res.render("base", {
      content: content,
    });
    // res.json({ content });
  }
});

app.listen(3000, function () {
  console.log("App started");
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app;
