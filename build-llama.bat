cd ./llama.cpp
$env:CUDATOOLKITDIR="C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8"
$env:GGML_CUDA='1'
$env:FORCE_CMAKE='1'
$env:CMAKE_ARGS='-DGGML_CUDA=on'
$env:CMAKE_ARGS='-DLLAMA_CUBLAS=on'
$env:CMAKE_ARGS='-DCMAKE_GENERATOR_TOOLSET="cuda=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8"'
$env:CUDAToolkit_ROOT='C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin'
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release