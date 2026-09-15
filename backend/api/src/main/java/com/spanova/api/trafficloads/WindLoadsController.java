package com.spanova.api.trafficloads;
import com.spanova.trafficloads.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/wind-loads") @CrossOrigin(origins="http://localhost:5173")
public class WindLoadsController { private final WindLoadsService service = new WindLoadsService(); @PostMapping("/resolve") public WindResult resolve(@RequestBody WindRequest request) { return service.resolve(request); } }
