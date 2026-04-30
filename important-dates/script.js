const createRoundedButton = () => {

    const roundedButton = document.querySelector('.important-dates-circle');
    
    const text = roundedButton.innerText;
    roundedButton.innerText = "";
    const p = document.createElement("p");
    p.classList.add("button__text");
    
    for(let i = 0; i < text.length; i++){
        const span = document.createElement("span");
        span.style = `--index: ${i};`;
        span.innerText = text[i];
        p.appendChild(span);
    }
    roundedButton.appendChild(p);
    
    const div = document.createElement("div");
    div.classList.add("button__circle");
    div.innerHTML = `
        <svg
          viewBox="0 0 14 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="button__icon"
          width="14"
        >
          <path
            d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z"
            fill="currentColor"
          ></path>
        </svg>
    
        <svg
          viewBox="0 0 14 15"
          fill="none"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
          class="button__icon button__icon--copy"
        >
          <path
            d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z"
            fill="currentColor"
          ></path>
        </svg>
    `
    
    roundedButton.appendChild(div);
}

document.addEventListener("DOMContentLoaded", createRoundedButton);