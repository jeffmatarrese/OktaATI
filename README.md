<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![React][React.js]][React-url]
[![TypeScript][TypeScript-badge]][TypeScript-url]
[![Vite][Vite-badge]][Vite-url]
[![TailwindCSS][Tailwind-badge]][Tailwind-url]
[![Python][Python-badge]][Python-url]
[![Azure][Azure-badge]][Azure-url]



<!-- PROJECT TITLE -->
<br />
<div align="center">

<h3 align="center">Agentic Threat Intelligence (ATI)</h3>

  <p align="center">
    A prototype + eval for an <strong>Okta Identity Threat Protection</strong> feature that detects anomalies in AI agent behavioral telemetry and recommends tiered enforcement (Stall / Restrict Scope / Session Kill).
    <br />
    <br />
    <a href="SOURCE_OF_TRUTH.md"><strong>Source of truth »</strong></a>
    <br />
    <br />
    <a href="https://okta-ati.vercel.app">Live prototype</a>
    &middot;
    <a href="https://www.loom.com/share/ec80c7707a4b4f4ebeaf96b9aded1a00">Demo walkthrough (Loom)</a>
    &middot;
    <a href="Eval/EVAL_WRITEUP.md">Eval results</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About the project</a>
      <ul>
        <li><a href="#built-with">Built with</a></li>
        <li><a href="#repo-layout">Repo layout</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#project-status">Project status</a></li>
    <li><a href="#contributors">Contributors</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About the project

ATI is a class project that prototypes an Okta Identity Threat Protection feature for AI agents. It pairs a working dashboard with a rigorous eval pipeline so the same telemetry stream that drives the UI is also benchmarked against a frozen scenario set.

[`SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md) is the single-document spec for the project as a whole — problem framing, telemetry shape, scenario library, classifier and judge contracts, eval methodology, prototype architecture, and repo conventions. When in doubt, start there.

The project ships four deliverables:

1. **Eval pipeline** ([`Eval/`](Eval/)) — LLM classifier (gpt-5.4-nano) + feature-based ML classifier (`bold_beard` AutoML), both graded by an LLM-as-judge over a frozen 50-scenario test set. Validates the eval methodology that would later grade a real ML classifier.
2. **Prototype** ([`Prototype/V2/`](Prototype/V2/)) — operator-facing dashboard with alerts, agents directory, and a Scenario Lab that replays real classifier outputs.
3. **Eval writeup** ([`Eval/EVAL_WRITEUP.md`](Eval/EVAL_WRITEUP.md)) — phase-by-phase results, methodology critique, and what a production version would need.
4. **Source of truth** ([`SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md)) — this is the master spec; the original framework doc ([`Reference/ATI_Eval_Framework.md`](Reference/ATI_Eval_Framework.md)) is the narrower eval-methodology spec that fed into it.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Built with

- [React][React-url] + [TypeScript][TypeScript-url]
- [Vite][Vite-url]
- [Tailwind CSS][Tailwind-url] + [shadcn/ui](https://ui.shadcn.com/)
- [zustand](https://zustand-demo.pmnd.rs/) for app state
- [Python][Python-url] 3.11 for the eval pipeline
- [Azure OpenAI][Azure-url] (gpt-5.4 + gpt-5.4-nano) and Azure ML AutoML

<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Repo layout

```
SOURCE_OF_TRUTH.md   master spec for the whole project — start here
Reference/           supporting docs (eval framework, product brief,
                     enforcement-tier design, PR/FAQ)
Eval/                Python eval pipeline against Azure AI Foundry
                     (gpt-5.4-nano LLM classifier + bold_beard AutoML model,
                     both graded by gpt-5.4 as judge)
  └─ EVAL_WRITEUP.md   phase-by-phase results, methodology critique, gaps
Prototype/V1/        frozen "before" artifact — original Lovable-generated dashboard
Prototype/V2/        active prototype (Vite + React + Tailwind + shadcn/ui)
```

Each subproject is independent — there is no top-level build, test, or lint.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting started

### Prerequisites

- **Node 20+** (or [Bun](https://bun.sh)) for the prototype
- **Python 3.11+** for the eval pipeline
- **Azure OpenAI** access (endpoint + API key) to run the eval against live models

### Installation

Clone the repo:

```sh
git clone https://github.com/jeffmatarrese/OktaATI.git
cd OktaATI
```

**Prototype:**

```sh
cd Prototype/V2
bun install        # or: npm install
bun run dev        # http://localhost:5173
```

**Eval pipeline:**

```sh
cd Eval
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY
python -m src.run_eval --dry-run   # validate without burning tokens
python -m src.run_eval             # full 50-scenario live run
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE -->
## Usage

**Try the prototype** — visit [okta-ati.vercel.app](https://okta-ati.vercel.app) (or run locally). Click **Scenario Lab** in the topbar, pick a scenario, send it through both classifiers, and watch the resulting alert pop into the dashboard. From the alert detail, you can apply an enforcement (Stall / Restrict Scope / Session Kill) or mark it as a false positive via **Ignore**.

**Watch the walkthrough** — [Loom demo video](https://www.loom.com/share/ec80c7707a4b4f4ebeaf96b9aded1a00).

**Run the eval** — from `Eval/`, `python -m src.run_eval` produces a scorecard in `Eval/results/` (JSON + Markdown + CSV). Outputs are gitignored. See [`Eval/README.md`](Eval/README.md) for the full eval workflow and the additional `cross_check`, `generate_scenarios`, and `build_comparison` commands.

**Read the eval writeup** — [`Eval/EVAL_WRITEUP.md`](Eval/EVAL_WRITEUP.md) is the implementation-side companion to the spec. It maps what was built to the framework and reports current head-to-head results across the two classifier generations.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- PROJECT STATUS -->
## Project status

- [x] **Phase 1** — bare-metal gpt-5.4-nano classifier (82% binary acc, 0% FPR, 33% T1 recall)
- [x] **Phase 2** — feature-based `bold_beard` AutoML soft-voting ensemble (84% binary acc, 73% T1 recall, 60% T3 recall, 91% anomalous recall)
- [x] **Phase 3** — Prototype V2 dashboard with evidence-chain detail, Scenario Lab, and end-to-end enforcement actions

Full numbers and methodology in [`Eval/EVAL_WRITEUP.md`](Eval/EVAL_WRITEUP.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTORS -->
## Contributors

This is a two-person class project. Both contributors share authorship.

- **Jeff Matarrese** — [@jeffmatarrese](https://github.com/jeffmatarrese)
- **Aaryn O'Quinn**

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) — README structure
- [shadcn/ui](https://ui.shadcn.com/) — component primitives for the prototype
- [Azure AI Foundry](https://azure.microsoft.com/en-us/products/ai-foundry) — model hosting for both classifier generations
- Class staff and feedback partners for the CISO review session that informed the V2 redesign

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & BADGES -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Vite-badge]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[Tailwind-badge]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Python-badge]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[Azure-badge]: https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white
[Azure-url]: https://azure.microsoft.com/
