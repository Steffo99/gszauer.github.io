class MemoryAllocator {
    constructor(wasmImportObject, memorySize) {
        this.pageSize = 512;
        this.heapBase = 0;
        this.numPages = Math.ceil(memorySize / this.pageSize);

        const maskCount = Math.ceil(this.numPages / 32);
        this.mask = new Uint32Array(maskCount);
        for (let i = 0; i < maskCount; this.mask[i++] = 0);

        const wasmPageSize = 64 * 1024; // 64 KiB
        const wasmPageCount = Math.ceil(memorySize / wasmPageSize);
        this.wasmMemory = new WebAssembly.Memory({
            initial: wasmPageCount,
            maximum: wasmPageCount
        });
        this.mem_u8 = new Uint8Array(this.wasmMemory.buffer, 0, this.wasmMemory.buffer.byteLength);

        this.allocations = {};

        if (!wasmImportObject.hasOwnProperty("env")) {
            wasmImportObject.env = {};
        }
        wasmImportObject.env.memory = this.wasmMemory;
        
        let self = this;

        wasmImportObject.env["lodepng_malloc"] = function(u32_size) {
            return self.Allocate(u32_size, 0);
        }

        wasmImportObject.env["lodepng_free"] = function(ptr_mem) {
            if (ptr_mem != 0) {
                return self.Release(ptr_mem);
            }
        }

        const ReallocFun = function(ptr_old, u32_newSize) {
            let newAlloc = self.Allocate(u32_newSize, 0);

            let bytes = u32_newSize;
            if (ptr_old != 0) {
                if (self.allocations.hasOwnProperty(ptr_old)) {
                    let descriptor = self.allocations[ptr_old];
                    if (descriptor.bytes < u32_newSize) {
                        bytes = descriptor.bytes;
                    }
                }
                else {
                    console.error("Trying to realloc untracked memory: " + ptr_old);
                }

                self.Copy(newAlloc, ptr_old, bytes);
                self.Release(ptr_old);
            }
            return newAlloc;
        }

        wasmImportObject.env["MemRealloc"] = ReallocFun;
        wasmImportObject.env["lodepng_realloc"] = ReallocFun;

        wasmImportObject.env["MemDbgPrintStr"] = function(ptr_str) {
            const stringToPrint = self.PointerToString(ptr_str);
            console.log("c++: " + stringToPrint);
        }

        wasmImportObject.env["MemDbgPrintUInt"] = function(uint) {
            console.log("c++: " + uint);
        }

        wasmImportObject.env["MemAllocate"] = function(bytes, alignment) {
            if (alignment === undefined) {
                alignment = 0;
            }
            if (alignment == null) {
                alignment = 0;
            }
            return self.Allocate(bytes, alignment);
        };

        wasmImportObject.env["MemRelease"] = function(ptr) {
            self.Release(ptr);
        };

        wasmImportObject.env["MemCopy"] = function(dst, src, bytes) {
            return self.Copy(dst, src, bytes);
        };

        wasmImportObject.env["MemClear"] = function(dst, bytes) {
            return self.Clear(dst, bytes);
        };

        wasmImportObject.env["MemSet"] = function(dst, val, bytes) {
            return self.Set(dst, val, bytes);
        };

        wasmImportObject.env["MemCmp"] = function(ptr_a, ptr_b, u32_bytes) {
            return self.Compare(ptr_a,ptr_b,u32_bytes);
        }

        wasmImportObject.env["memcpy"] = function(ptr_dest, ptr_src, int_len) {
            return self.Copy(ptr_dest,ptr_src,int_len);
        }

        this.decoder = new TextDecoder();
    }

    AttachToWasmInstance(wasmInsance) {
        const heap_base = wasmInsance.exports.WasmHeapBase();
        this.heapBase = heap_base;
    }

    Allocate(bytes, alignment) {
        const memNeeded = bytes + alignment;
        const pagesNeeded = Math.ceil(memNeeded / this.pageSize);

        let first_page = -1;
        let num_pages = 0;

        const numPages = this.numPages;
        // Keep first page as 1 to avoid writing to 0
        for (let page = 0; page < numPages; ++page) {
            let i = ~~(page / 32);
            let j = page % 32;

            const occupied = this.mask[i] & (1 << j);
            if (!occupied) {
                if (first_page == -1) {
                    first_page = page;
                }
                num_pages += 1;
            }
            else {
                first_page = -1;
                num_pages = 0;
            }

            if (num_pages >= pagesNeeded) {
                break; // Break J loop
            }
        }

        if (num_pages == 0 || first_page == -1) {
            console.error("Failed to allocate " + pagesNeeded + " pages. " + bytes + " bytes requested + " + alignment + " alignment.");
            return 0;
        }

        for (let i = first_page; i < first_page + num_pages; ++i) {
            const index = ~~(i / 32);
            const bit = i % 32;
            this.mask[index] |= (1 << bit);
        }

        let pointer = first_page * this.pageSize  + this.heapBase;
        let alignedPtr = pointer + ((alignment != 0)? (pointer % alignment) : 0);

        if (alignedPtr == 0 || pointer == 0) {
            console.error("malloc about to return 0");
        }

        let allocationDescriptor = {
            start: first_page,
            length: num_pages,
            bytes: bytes,
            alignment: alignment
        };

        if (this.allocations.hasOwnProperty(alignedPtr)) {
            console.error("Trying to double allocate the same pointer: " + pointer);
        }
        this.allocations[alignedPtr] = allocationDescriptor;
      
        return alignedPtr;
    }

    Release(alignedPtr) {
        if (this.allocations.hasOwnProperty(alignedPtr)) {
            let descriptor = this.allocations[alignedPtr];

            for (let i = descriptor.start; i < descriptor.start + descriptor.length; ++i) {
                const index = ~~(i / 32);
                const bit = i % 32;
                this.mask[index] &= ~(1 << bit);
            }

            delete this.allocations[alignedPtr];
        }
        else {
            console.error("Trying to release untracked memory: " + alignedPtr);
        }
    }

    Copy(dst, src, bytes) {
        for (let i = 0; i < bytes; ++i) {
            this.mem_u8[dst + i] = this.mem_u8[src + i];
        }
        return dst;
    }

    Clear(mem, bytes) {
        for (let i = 0; i < bytes; ++i) {
            this.mem_u8[mem + i] = 0;
        }
        return mem;
    }

    Compare(ptr_a, ptr_b, bytes) {
        for (let i = 0; i < bytes; ++i) {
            const va = this.mem_u8[ptr_a + i];
            const vb = this.mem_u8[ptr_b + i];
            if (va < vb) {
                return -1;
            }
            else if (vb < va) {
                return 1;
            }
        }

        return 0;
    }

    Set(mem, val, bytes) {
        for (let i = 0; i < bytes; ++i) {
            this.mem_u8[mem + i] = val;
        }
        return mem;
    }

    PointerToString(ptr) {
        let iter = ptr;
        while(this.mem_u8[iter] != 0) {
            iter += 1;

            if (iter - ptr > 5000) {
                console.error("MemoryAllocator.PointerToString loop took too long");
                break;
            }
        }
        return this.decoder.decode(new Uint8Array(this.wasmMemory.buffer, ptr, iter - ptr));
    }
}