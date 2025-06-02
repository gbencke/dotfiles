function _create_pr(){
  echo "" > create_pr.md
  echo "Please create a Pull Request Description from below diff:\n" >> create_pr.md
  echo "Be as concise and technical as possible, indicating the file where each change was made\n" >> create_pr.md
  echo "There is no need to provide test instructions, please only describe the changes made.\n" > create_pr.md
  git diff $1 $2 >> create_pr.md

  cat create_pr.md | pbcopy
  rm create_pr.md
}

alias create_pr=_create_pr

