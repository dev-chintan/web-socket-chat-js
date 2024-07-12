document.addEventListener("DOMContentLoaded", () => {
    const socket = new WebSocket("ws://localhost:3000");

    socket.onopen = () => {
        console.log("WebSocket open!");
    }

    socket.onmessage = (event) => {
        console.log("WebSocket message: " + event.data);
    }

    socket.onclose = () => {
        console.log("WebSocket closed.");
    }

    socket.onerror = (event) => {
        console.error("WebSocket error: " + event);
    }

    let messageList = document.getElementById("message-list");
    let messageInput = document.getElementById("message-input");
    let sendMessageBtn = document.getElementById("send-message");

    sendMessageBtn.addEventListener("click", () => {
        const message = messageInput.value.trim();
        if(!message) {
            alert("Please enter a message!");
            return;
        }
        socket.send(message);
    })

    messageInput.addEventListener("keydown", (event) => {
        if(event.key === "Enter") {
            sendMessageBtn.click();
        }
    })
})
