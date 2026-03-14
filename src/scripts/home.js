const clankerprompt = document.getElementById("clankerprompt");
if (sessionStorage.getItem("clankerprompted") != "true") {
    clankerprompt.style.display = "flex";
    sessionStorage.setItem("clankerprompted", "true")
}