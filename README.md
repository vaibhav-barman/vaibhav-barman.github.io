# Vaibhav Barman — AI Engineer Portfolio

A personal portfolio and résumé website showcasing AI engineering projects, technical skills, education, and links to professional profiles. The site is generated from a single JSON data file and deployed with GitHub Pages.

**Live website:** https://vaibhav-barman.github.io  
**GitHub:** https://github.com/vaibhav-barman

## About

I’m focused on building practical applications with large language models (LLMs), retrieval-augmented generation (RAG), and AI-agent workflows. My projects explore Python-based AI systems, local models, structured outputs, evaluation, and reliable backend design.

## Featured Projects

The portfolio currently highlights AI engineering projects, including:

- **LocalForge-AI** — a local-first multi-agent software development and QA workflow using LangGraph and Ollama.
- **PromptRoute** — an LLM-powered travel itinerary planner that produces structured travel plans using a local model.
- **Recovery — AI Payment Recovery Agent** — an AI-assisted payment recovery workflow with classification, strategy selection, and feedback.
- **Odyssey RAG** — a retrieval-augmented question-answering system for *The Odyssey*, with retrieval evaluation.
- **Local YouTube Video Summarizer** — transcribes videos with Whisper and summarizes them using a local Ollama model.
- **GNews MCP Server** — an MCP server exposing news search and headline tools.
- **ApplyIQ** — an AI-powered resume and job-description analysis application.
- **Gemini Website Summarizer** — extracts website text and summarizes it with the Gemini API.

See the live website and linked repositories for project details and source code.

## Tech Stack

- **Languages:** Python, JavaScript, TypeScript, SQL
- **AI/LLM:** LLM APIs, prompt engineering, RAG, AI agents, Ollama, Gemini
- **Backend:** FastAPI, MCP/FastMCP, SQLAlchemy
- **Frontend:** React, Vite, Tailwind CSS
- **Data and persistence:** PostgreSQL, SQLite
- **Tools:** Git, GitHub, `uv`
- **Deployment:** GitHub Pages

## How It Works

The website is built with the [portfolio_generator](https://github.com/vaibhav-barman/portfolio) project, based on Corey Schafer’s portfolio generator. Portfolio information is stored in `portfolio.json`; a Python script uses templates to generate the static website files.

Update `portfolio.json` to change portfolio content, then run the generator to rebuild the site.

## Run Locally

### Requirements

- Python
- [`uv`](https://docs.astral.sh/uv/) for Python environment and dependency management

### Setup

Clone the website repository:

```bash
git clone https://github.com/vaibhav-barman/vaibhav-barman.github.io.git
cd vaibhav-barman.github.io
```

If the repository already includes its `pyproject.toml` and lock file, sync the environment:

```bash
uv sync
```

Generate the website:

```bash
uv run python generate_portfolio.py
```

Start a local static web server:

```bash
uv run python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

> If you are setting up the project from a copy that does not include a `pyproject.toml` yet, initialize `uv` and install the generator dependencies before running the script:
>
> ```bash
> uv init --bare
> uv add "Jinja2==3.1.4" "MarkupSafe==3.0.2"
> uv run python generate_portfolio.py
> ```

## Updating Portfolio Content

1. Edit `portfolio.json`.
2. Add or update project entries and links.
3. Place profile images or other local assets in the appropriate folder (for example, `img/profile.png`).
4. Ensure `image_path` in `portfolio.json` matches the actual image path and filename.
5. Regenerate the website:

   ```bash
   uv run python generate_portfolio.py
   ```

6. Review the generated site locally before publishing.

## Deploy to GitHub Pages

The site is published from the `main` branch of `vaibhav-barman/vaibhav-barman.github.io`.

1. Commit the generated website and any updated assets.
2. Push the changes to GitHub:

   ```bash
   git add .
   git commit -m "Update portfolio"
   git push origin main
   ```

3. In the repository, open **Settings → Pages** and confirm GitHub Pages is configured to deploy from the `main` branch and the repository root.
4. Once deployment completes, visit https://vaibhav-barman.github.io.

## Repository

- **Website repository:** https://github.com/vaibhav-barman/vaibhav-barman.github.io
- **Generator repository:** https://github.com/vaibhav-barman/portfolio
- **Live site:** https://vaibhav-barman.github.io

## License

The portfolio content and custom changes are maintained in this repository. The underlying generator is based on [Corey Schafer’s portfolio generator](https://github.com/CoreyMSchafer/portfolio_generator); check the original project and its license for applicable attribution and licensing terms.
