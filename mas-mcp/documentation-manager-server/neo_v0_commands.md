# Neo Command System Documentation

## Available Commands

### Project Initialization & Setup
| Command | Flags | Description | Related Chains |
|---------|-------|-------------|----------------|
| `/init_project` | `--name`: Project name (required)<br>`--type`: [web\|cli\|library] (default: web)<br>`--path`: Project path (default: ./projects) | Initialize a new project with standard structure | - `chains/project_init_chain.md` |
| `/init_existing_project` | `--path`: Project path (required)<br>`--name`: Project name<br>`--type`: Project type | Prerequisites: None<br>Onboard an existing project into SDLC pipeline | - `chains/project_onboarding_chain.md` |
| `/generate_project` | `--name`: Project name (required)<br>`--template`: Template name (default: basic)<br>`--path`: Output path | Prerequisites: None<br>Generate a project structure from template | - `chains/project_generation_chain.md` |
| `/generate_structure` | `--template`: Template name (default: standard)<br>`--output`: Output path<br>`--customize`: [true\|false] (default: false) | Prerequisites: None<br>Create/update project structure | - `chains/structure_generation_chain.md` |
| `/setup_context` | `--path`: Project path (default: .)<br>`--type`: Context type (default: full)<br>`--force`: [true\|false] (default: false) | Prerequisites: Project initialization<br>Setup context management system | - `chains/context_setup_chain.md` |
| `/configure_env` | `--template`: Environment template (default: standard)<br>`--vars`: Environment variables | Prerequisites: None<br>Configure development environment | - `chains/environment_setup_chain.md` |
| `/init_version_control` | `--type`: VCS type (default: git)<br>`--remote`: Remote URL | Prerequisites: Project initialization<br>Initialize version control system | - `chains/vcs_setup_chain.md` |

### Documentation & Requirements
| Command | Flags | Description | Related Chains |
|---------|-------|-------------|----------------|
| `/init_requirement_docs` | `--output`: Output directory (default: docs/requirements)<br>`--template`: Template name (default: standard)<br>`--format`: Document format (default: markdown) | Prerequisites: `/init_project` or `/init_existing_project`<br>Setup initial requirements documentation | - `chains/requirements_chain.md` |
| `/init_design_docs` | `--output`: Output directory (default: docs/design)<br>`--template`: Template name (default: standard)<br>`--format`: Document format (default: markdown) | Prerequisites: `/init_requirement_docs`<br>Setup design phase documentation | - `chains/design_chain.md` |
| `/init_dev_docs` | `--output`: Output directory (default: docs/development)<br>`--template`: Template name (default: standard)<br>`--format`: Document format (default: markdown) | Prerequisites: `/init_design_docs`<br>Setup development phase documentation | - `chains/development_chain.md` |
| `/generate_docs` | `--output`: Output directory (default: docs)<br>`--format`: [markdown\|html\|pdf] (default: markdown)<br>`--include`: [all\|api\|technical\|design] (default: all)<br>`--template`: Template name (default: standard)<br>`--toc`: [true\|false] (default: true) | Prerequisites: None<br>Generate comprehensive project documentation | - `chains/documentation_chain.md`<br>- `chains/api_docs_chain.md` |

### Code Analysis & Quality
| Command | Flags | Description | Related Chains |
|---------|-------|-------------|----------------|
| `/generate_knowledge_graph` | `--path`: Project root path (required)<br>`--output`: Custom output path (default: code-knowledge-graph.json)<br>`--format`: [json\|yaml] (default: json)<br>`--include_tests`: [true\|false] (default: true)<br>`--depth`: Analysis depth level (default: 3) | Prerequisites: None<br>Generate a contextual knowledge graph of the codebase | - `chains/code_analysis_chain.md`<br>- `chains/knowledge_graph_chain.md` |
| `/optimize_code` | `--target`: File path (required)<br>`--chain`: Chain file path<br>`--mode`: [auto\|aggressive\|conservative] (default: auto)<br>`--level`: [quick\|moderate\|deep] (default: moderate) | Prerequisites: None<br>Optimize and improve code quality | - `chains/code_improver_chain.md`<br>- `chains/code_quality_chain.md` |
| `/evaluate_code` | `--target`: File/directory path<br>`--metrics`: Comma-separated metrics (default: all)<br>`--format`: Output format (default: text) | Prerequisites: None<br>Analyze and rate code quality | - `chains/code_evaluation_chain.md` |
| `/analyze_code` | `--path`: Code path<br>`--depth`: [quick\|full] (default: quick)<br>`--type`: Analysis type (default: all) | Prerequisites: None<br>Perform deep code analysis | - `chains/code_analysis_chain.md` |

### UI/UX & Design
| Command | Flags | Description | Related Chains |
|---------|-------|-------------|----------------|
| `/init_ui_interpretation_chain` | `--input`: UI description/screenshot<br>`--output`: Output directory (default: ui_components)<br>`--style`: Design system name (default: shadcn-ui) | Prerequisites: None<br>Initialize UI interpretation workflow | - `chains/ui_interpretation_chain.md` |
| `/capture_screenshots` | `--url`: Target URL (required)<br>`--viewport`: Viewport sizes (default: desktop,tablet,mobile)<br>`--output`: Output directory (default: screenshots) | Prerequisites: None<br>Capture UI screenshots | - `chains/ui_capture_chain.md` |
| `/compare_design_system` | `--current`: Current design (required)<br>`--target`: Target design (required)<br>`--output`: Report path | Prerequisites: None<br>Compare design system implementations | - `chains/design_comparison_chain.md` |

### Feature & Audit Management
| Command | Flags | Description | Related Chains |
|---------|-------|-------------|----------------|
| `/feature_request` | `--title`: Feature title (required)<br>`--description`: Detailed description (required)<br>`--priority`: [High\|Medium\|Low] (default: Medium)<br>`--target_release`: Version number<br>`--stakeholders`: Comma-separated list<br>`--dependencies`: Comma-separated list<br>`--constraints`: Technical/business constraints | Prerequisites: None<br>Submit a new feature request using the standard template | - `chains/feature_analysis_chain.md`<br>- `chains/requirements_chain.md` |
| `/process_audit_findings` | `--input`: Audit report path (required)<br>`--output`: Output path<br>`--format`: Output format (default: markdown) | Prerequisites: None<br>Convert audit findings into actionable items | - `chains/audit_processing_chain.md` |
| `/generate_audit_report` | `--scope`: Audit scope (default: full)<br>`--format`: Report format (default: markdown)<br>`--output`: Output path | Prerequisites: None<br>Generate comprehensive audit report | - `chains/audit_generation_chain.md` |

### System & Configuration
| Command | Flags | Description | Related Chains |
|---------|-------|-------------|----------------|
| `/validate_config` | `--config`: Config file path<br>`--schema`: Schema file path<br>`--strict`: [true\|false] (default: false) | Prerequisites: None<br>Validate configuration files against schema | - `chains/validation_chain.md` |
| `/continue` | None | Prerequisites: None<br>Continue from the last task | - All active chains |
| `/get_status` | `--format`: Output format (default: text)<br>`--verbose`: [true\|false] (default: false) | Prerequisites: None<br>Check system's current status | N/A |
| `/get_git_status` | `--format`: Output format (default: text)<br>`--verbose`: [true\|false] (default: false) | Prerequisites: None<br>Check Git repository status | N/A |
| `/get_help` | `--topic`: Specific topic<br>`--format`: Output format (default: text) | Prerequisites: None<br>Display available commands and usage | N/A |

## Usage Examples

```bash
# Submit a new feature request
/feature_request \
  --title="Automated Test Generation" \
  --description="Add capability to automatically generate unit tests based on code analysis" \
  --priority="High" \
  --target_release="v1.2.0" \
  --stakeholders="QA Lead, Dev Team Lead" \
  --dependencies="test framework, code analyzer"

# Generate knowledge graph
/generate_knowledge_graph \
  --path="/path/to/project" \
  --format="json" \
  --include_tests=true \
  --depth=3

# Generate documentation
/generate_docs \
  --output="docs" \
  --format="markdown" \
  --include="all" \
  --toc=true

# Initialize UI interpretation chain
/init_ui_interpretation_chain \
  --input="design/mockup.png" \
  --output="ui_components" \
  --style="shadcn-ui"

# Setup project context
/setup_context \
  --path="." \
  --type="full" \
  --force=false
```

## Notes

- All paths can be absolute or relative to the workspace root
- Commands with required flags will prompt for them if not provided
- Use `--help` with any command to see detailed usage information
- Chain files can be customized in the `chains/` directory
- Some commands may trigger multiple sub-commands as part of their workflow
- Prerequisites indicate which commands should be run before using a command
- Default values are provided in brackets where applicable
