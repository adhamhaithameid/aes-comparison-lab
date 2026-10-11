cmake_minimum_required(VERSION 3.16)
project(aes_comparison VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# --- OpenSSL -----------------------------------------------------------------
# On macOS with Homebrew, OpenSSL is keg-only; help CMake find it.
if(APPLE)
    foreach(prefix
            /opt/homebrew/opt/openssl@4
            /opt/homebrew/opt/openssl@3
            /opt/homebrew/opt/openssl
            /usr/local/opt/openssl)
        if(EXISTS "${prefix}")
            list(APPEND CMAKE_PREFIX_PATH "${prefix}")
        endif()
    endforeach()
endif()
find_package(OpenSSL REQUIRED)

# --- Library: from-scratch AES ------------------------------------------------
add_library(aes_core STATIC src/aes_core.cpp)
target_include_directories(aes_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_options(aes_core PRIVATE -Wall -Wextra -Wpedantic)

# --- Library: OpenSSL GCM wrapper ---------------------------------------------
add_library(aes_gcm STATIC src/aes_gcm_openssl.cpp)
target_include_directories(aes_gcm PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_link_libraries(aes_gcm PUBLIC OpenSSL::Crypto)
target_compile_options(aes_gcm PRIVATE -Wall -Wextra -Wpedantic)

# --- Executables ---------------------------------------------------------------
add_executable(aes_scratch src/aes_scratch_main.cpp)
target_link_libraries(aes_scratch PRIVATE aes_core)
target_include_directories(aes_scratch PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_vectors)
target_compile_options(aes_scratch PRIVATE -Wall -Wextra -Wpedantic)

add_executable(aes_openssl src/aes_openssl_main.cpp)
target_link_libraries(aes_openssl PRIVATE aes_gcm)
target_compile_options(aes_openssl PRIVATE -Wall -Wextra -Wpedantic)

add_executable(aes_tests src/test_main.cpp)
target_link_libraries(aes_tests PRIVATE aes_core aes_gcm OpenSSL::Crypto)
target_include_directories(aes_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_vectors)
target_compile_options(aes_tests PRIVATE -Wall -Wextra -Wpedantic)

add_executable(aes_benchmark src/benchmark.cpp)
target_link_libraries(aes_benchmark PRIVATE aes_core aes_gcm OpenSSL::Crypto)
target_compile_options(aes_benchmark PRIVATE -Wall -Wextra -Wpedantic)

# --- Testing -------------------------------------------------------------------
enable_testing()
add_test(NAME unit_tests COMMAND aes_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_vectors)

# --- Optional sanitizer build ----------------------------------------------------
option(AES_ENABLE_SANITIZERS "Build with AddressSanitizer and UndefinedBehaviorSanitizer" OFF)
if(AES_ENABLE_SANITIZERS)
    add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
    add_link_options(-fsanitize=address,undefined)
endif()
