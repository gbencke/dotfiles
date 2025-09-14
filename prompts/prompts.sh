function _create_pr_only_description(){
  # Check if at least one argument is provided
  if [ $# -eq 0 ]; then
    echo "Error: Please provide a pull request description as an argument."
    echo "Usage: create_pr_complete \"Your PR description here\""
    return 1
  fi

  echo "" > create_pr_complete.md
  echo "# Pull Request Review Description Template for LLM

Use this template to prompt a Large Language Model (LLM) to generate an insightful, actionable, and well-structured pull request review description.
Please use english language and the output needs to be in markdown format.

---

## Prompt Template

You are an experienced software engineer and code reviewer. Given the following pull request details, generate a thorough, constructive, and actionable pull request review description. Be specific, clear, and concise.

**Instructions:**
 Summarize the purpose and scope of the pull request in 1–2 sentences.
- List the main changes introduced, referencing relevant files or modules.
- List the main changes introduced, per changed file.
- Point out strengths or well-implemented aspects.
- Maintain a positive and professional tone.

**Input:**
- Pull Request Description: $(echo $1)
- List of Changed Files: \n " >> create_pr_complete.md

git diff -U10 --staged --name-only >> create_pr_complete.md

echo " \n## Pull Request Review Description Template for LLM
- Relevant Diff or Code Snippet (optional): \n \n " >> create_pr_complete.md

git diff -U10 --staged  >> create_pr_complete.md

echo " **Pull Request Review**

**Summary:**
- {{LLM generates a brief summary of the PR’s purpose and scope in markdown format.}}

**Main Changes:**
- {{LLM lists and briefly explains the key changes in markdown format.}}

**Detailed Changes:**
- {{LLM describes the changes for each modified file in markdown format}}

---

**Review Tone:**
- Supportive, clear, and focused on code quality and collaboration in markdown format.

---

**End of Template**" >> create_pr_complete.md
}


function _create_pr_complete(){
  # Check if at least one argument is provided
  if [ $# -eq 0 ]; then
    echo "Error: Please provide a pull request description as an argument."
    echo "Usage: create_pr_complete \"Your PR description here\""
    return 1
  fi

  echo "" > create_pr_complete.md
  echo "# Pull Request Review Description Template for LLM

Use this template to prompt a Large Language Model (LLM) to generate an insightful, actionable, and well-structured pull request review description.
Please use english language and the output needs to be in markdown format.

---

## Prompt Template

You are an experienced software engineer and code reviewer. Given the following pull request details, generate a thorough, constructive, and actionable pull request review description. Be specific, clear, and concise.

**Instructions:**
- Summarize the purpose and scope of the pull request in 1–2 sentences.
- List the main changes introduced, referencing relevant files or modules.
- Point out strengths or well-implemented aspects.
- Identify potential issues, concerns, or improvements (e.g., code quality, tests, documentation, edge cases).
- Suggest next steps, if needed (e.g., additional tests, refactoring, documentation updates).
- Maintain a positive and professional tone.

**Input:**
- Pull Request Description: $(echo $1)
- List of Changed Files: \n " >> create_pr_complete.md

git diff -U10 --staged --name-only >> create_pr_complete.md

echo " \n # Pull Request Review Description Template for LLM
- Relevant Diff or Code Snippet (optional): \n \n " >> create_pr_complete.md

git diff -U10 --staged  >> create_pr_complete.md

echo " **Pull Request Review**

**Summary:**
{{LLM generates a brief summary of the PR’s purpose and scope.}}

**Main Changes:**
- {{LLM lists and briefly explains the key changes.}}

---

**Review Tone:**
- Supportive, clear, and focused on code quality and collaboration.

---

**End of Template**" >> create_pr_complete.md
}

function _generate_pr_description(){
  # Check if at least one argument is provided
  if [[ $# -eq 0 ]]; then
    echo "Error: Please provide a pull request description as an argument."
    echo "Usage: create_pr_complete \"Your PR description here\""
    return 1
  fi

  rm -rf *create_pr_complete.md

  _create_pr_only_description $1
  if [[ -z "./create_pr_complete.md" ]]; then
      echo "create_pr_complete.md not found"
      exit 1
  fi

  DATE=$(date -u '+%Y%m%d.%H%M%S')
  arr=(${=PR_MODELS_TO_RUN})

  INSTRUCTIONS_FILE="$DATE.create_pr_complete.md"
  mv create_pr_complete.md $INSTRUCTIONS_FILE
  INPUT=$(cat $INSTRUCTIONS_FILE | jq -sR @json)
  if [[ -n "${AI_BACKUP_PR_FOLDER}" ]]; then
      mv $INSTRUCTIONS_FILE "$AI_BACKUP_PR_FOLDER"
  fi

  for ((i=1; i<=${#arr[@]}; i+=2)); do
      model_name="${arr[i]}"
      model_slug="${arr[i+1]}"
      export LANG=en_US.UTF-8
      echo "Pair: $model_name and $model_slug"
      OUTPUT="$DATE.$model_name.md"
      curl https://openrouter.ai/api/v1/chat/completions \
            -H "Authorization: Bearer $OPENROUTER_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
            \"model\": \"$model_slug\",
            \"messages\": [
                { \"role\": \"user\", \"content\": $INPUT }
            ]
            }" \
            -o $OUTPUT.tmp
      cat $OUTPUT.tmp |jq -r '.choices.[0].message.content' > $OUTPUT
      rm $OUTPUT.tmp
      if [[ -n "${AI_BACKUP_PR_FOLDER}" ]]; then
          mv "$OUTPUT" "$AI_BACKUP_PR_FOLDER"
      fi
  done
}

function _review_pr_complete_instructions(){
  case $1 in
      "staged" )
        SOURCE_PATH="${(%):-%x}"
        files=$( git diff --name-only --cached)
        files_=$(echo "$files" | paste -sd ',' -)
        code2prompt -O ./code2prompt.md -i $files_ . 
        cat ./code2prompt.md > ./review_pr_complete.md
        cat "$(dirname -- $SOURCE_PATH)/./pr.guides/$2" >> ./review_pr_complete.md
      ;;
      "staged_dependencies" | "all" )
        code2prompt -O ./code2prompt.md -e review_pr_complete.md . 
        cat "$(dirname -- $SOURCE_PATH)/./pr.guides/$2" >> ./review_pr_complete.md
        cat ./code2prompt.md >> ./review_pr_complete.md
        return 1
      ;;
      "staged_diff" )
        code2prompt -O ./code2prompt.md -e review_pr_complete.md . 
        cat "$(dirname -- $SOURCE_PATH)/./pr.guides/$2" >> ./review_pr_complete.md
        cat ./code2prompt.md >> ./review_pr_complete.md
        echo "**Input:**
        - List of Changed Files: \n " >> create_pr_complete.md

        git diff -U10 --staged --name-only >> create_pr_complete.md

        echo " \n## Pull Request Review Description Template for LLM
        - Relevant Diff or Code Snippet (optional): \n \n " >> create_pr_complete.md

        git diff -U10 --staged  >> create_pr_complete.md
        return 1
      ;;
      * )
        echo "Error please provide the files to be added"
        return 1
  esac
  # echo $files_
  echo "\n\nPlease review the code above, according to the guidelines.\n" >> ./review_pr_complete.md
}

function _clean_intermediate_files(){
  rm -f ./code2prompt.md 2>/dev/null
  rm -f ./review_pr_complete.md 2>/dev/null
}

function _find_git_root() {
  # Navigate directory structure upwards to find the Git repository root
  # Returns only the directory name (basename), not the full path
  local current_dir
  current_dir=$(pwd)
  
  while [[ "$current_dir" != "" ]]; do
    if [[ -d "$current_dir/.git" ]]; then
      # Get just the directory name, not the full path
      echo "$(basename "$current_dir")"
      return 0
    fi
    
    # Stop if we've reached the filesystem root
    if [[ "$current_dir" == "/" ]]; then
      echo ""
      return 1
    fi
    
    # Move up one directory
    current_dir=$(dirname "$current_dir")
  done
  
  # If we get here, no .git directory was found
  echo ""
  return 1
}


function _review_code_pr(){
  # Check if exactly 2 arguments are provided: files_to_be_included and template_file
  if [[ $# -lt 3 ]]; then
    echo ""
    echo -e "\033[31mError: Please enter the template to use and also the files to be reviewed:\033[0m"
    echo ""
    echo -e "\033[33mUsage: review_code_pr <<Context Window:[staged|staged_dependencies|staged_diff|all]>> <<Command file>> <<Persona file>>\033[0m"
    echo -e "\033[34mWhere:\033[0m"
    echo ""
    echo -e "* \033[1mContext Window\033[0m: This is the type of context that will be used for this command"
    echo ""
    echo -e "* \033[1mCommand\033[0m: the command prompt, there are the following:"
    echo -e "    \033[3mpr_guidelines_architecture\033[0m: general prompt for architectural review"
    echo -e "    \033[3mpyramid_refactoring\033[0m: prompt for pyramid refactoring type of review"
    echo ""
    echo -e "* \033[1mPersona\033[0m: The characteristics of the person or guidelines:"
    echo -e "    \033[3mbootstrap_prompt\033[0m: Complete guidelines"
    echo -e "    \033[3mgood_general_guideline\033[0m: Simple guidelines"
    echo ""
    return 1
  fi

  _clean_intermediate_files

  SOURCE_PATH="${(%):-%x}"
  echo "" > ./review_pr_complete.md
  cat "$(dirname -- $SOURCE_PATH)/./guidelines/$3" >> ./review_pr_complete.md

  _review_pr_complete_instructions $1 $2
  if [[ -z "./review_pr_complete.md" ]]; then
      echo "review_pr_complete.md not found"
      return 1
  fi

  DATE=$(date -u '+%Y%m%d.%H%M%S')
  arr=(${=PR_MODELS_TO_RUN})
  GITROOT=$(_find_git_root)

  INSTRUCTIONS_FILE="$DATE.$GITROOT.review_pr_complete.md"
  mv review_pr_complete.md $INSTRUCTIONS_FILE
  INPUT=$(cat $INSTRUCTIONS_FILE | jq -sR @json)
  if [[ -n "${AI_BACKUP_PR_FOLDER}" ]]; then
      mv $INSTRUCTIONS_FILE "$AI_BACKUP_PR_FOLDER"
  fi

  _clean_intermediate_files

}

alias create_pr_complete=_create_pr_complete
alias create_pr_only_description=_create_pr_only_description
alias generate_pr_description=_generate_pr_description
alias review_code_pr=_review_code_pr
alias find_git_root=_find_git_root
