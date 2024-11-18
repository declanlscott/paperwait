package lifecycle

import (
	"context"
	"errors"
	"log"
	"os"

	"tailscale.com/client/tailscale"
)

func cleanup(c <-chan os.Signal) {
	for sig := range c {
		log.Printf("%v signal received\n", sig)

		cleanupOnce.Do(func() {
			log.Println("Cleaning up ...")

			if server == nil {
				return
			}

			ctx, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
			defer cancel()

			done := make(chan struct{})
			go func() {
				defer close(done)

				log.Println("Deleting Tailscale device ...")
				if err := deleteDevice(ctx); err != nil {
					log.Printf("Failed to delete Tailscale device: %v\n", err)
				}

				log.Println("Shutting down Tailscale server ...")
				if err := server.Close(); err != nil {
					log.Printf("Failed to shut down Tailscale server: %v\n", err)
				}
			}()

			select {
			case <-ctx.Done():
				log.Println("Cleanup timed out")
			case <-done:
				log.Println("Cleanup completed successfully")
			}
		})

		return
	}
}

func deleteDevice(ctx context.Context) error {
	tailscale.I_Acknowledge_This_API_Is_Unstable = true

	client, err := server.APIClient()
	if err != nil {
		return err
	}

	devices, err := client.Devices(ctx, tailscale.DeviceAllFields)
	if err != nil {
		return err
	}

	for _, device := range devices {
		addrMap := make(map[string]bool)

		ipv4, ipv6 := server.TailscaleIPs()
		addrMap[ipv4.String()] = true
		addrMap[ipv6.String()] = true

		for _, addr := range device.Addresses {
			if addrMap[addr] {
				if err := client.DeleteDevice(ctx, device.DeviceID); err != nil {
					return err
				}

				return nil
			}
		}
	}

	return errors.New("tailscale device not found")
}
