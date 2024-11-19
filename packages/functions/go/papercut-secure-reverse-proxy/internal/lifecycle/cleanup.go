package lifecycle

import (
	"context"
	"log"
	"os"
)

func cleanup(c <-chan os.Signal) {
	sig := <-c
	log.Printf("%v signal received\n", sig)

	cleanupSync.once.Do(func() {
		log.Println("Cleaning up ...")

		ctx, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
		defer cancel()

		cleanupSync.wg.Add(2)
		go deleteDevice(ctx)
		go shutdownServer()

		done := make(chan struct{})
		go func() {
			defer close(done)
			cleanupSync.wg.Wait()
		}()

		select {
		case <-ctx.Done():
			log.Println("Cleanup timed out")
		case <-done:
			log.Println("Cleanup completed successfully")
		}

		log.Println("Exiting ...")
		os.Exit(0)
	})
}

func deleteDevice(ctx context.Context) {
	defer cleanupSync.wg.Done()
	log.Println("Deleting Tailscale device ...")

	if ts.nodeId == nil {
		log.Println("No Tailscale device to delete")
		return
	}

	if err := ts.client.DeleteDevice(ctx, string(*ts.nodeId)); err != nil {
		log.Printf("Failed to delete Tailscale device: %v\n", err)
	}
}

func shutdownServer() {
	defer cleanupSync.wg.Done()
	log.Println("Shutting down Tailscale server ...")

	if ts.server == nil {
		log.Println("No Tailscale server to shut down")
		return
	}

	if err := ts.server.Close(); err != nil {
		log.Printf("Failed to shut down Tailscale server: %v\n", err)
	}
}
