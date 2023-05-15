set guifont=Inconsolata:h12:b
let g:neovide_transparency=0.7
let g:neovide_scroll_animation_length = 0.0
let g:neovide_cursor_animation_length = 0.0
let g:neovide_padding_top=10

call plug#begin()
    Plug 'https://github.com/sainnhe/everforest'
call plug#end()

set background=dark

let g:everforest_better_performance=1

colorscheme everforest
