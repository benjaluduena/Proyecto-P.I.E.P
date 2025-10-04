const { createClient } = require("@supabase/supabase-js");
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testMaterial() {
  const materialId = "114"; // usa el id que querés probar
  const { data, error } = await supabase
    .from("study_outputs")
    .select("*")
    .eq("id", materialId)
    .maybeSingle();

  if (error) {
    console.error("Error Supabase:", error);
  } else if (!data) {
    console.log("Material no encontrado.");
  } else {
    console.log("Material encontrado:", data);
  }
}

testMaterial();
