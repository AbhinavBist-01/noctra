import "dotenv/config";
import { corsair } from "./corsair";

const main = async () => {
  const result = await corsair.withTenant("dev").gmail.api.threads.list({});
  console.log(result);
};

main();
