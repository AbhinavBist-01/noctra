import { app } from "./app";

app.listen(process.env.EXPRESS_PORT || 3000, () => {
  console.log("Server is running...");
});
